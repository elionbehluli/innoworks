/// <reference types="deno" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { ensureGmailAccessToken, gmailFetch } from "../_shared/gmail-token.ts"
import { createAdminClient } from "../_shared/supabase-admin.ts"

function decodeBase64Url(encodedString: string): string {
  if (!encodedString) return ""
  const base64 = encodedString.replace(/-/g, "+").replace(/_/g, "/")
  try {
    return decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    )
  } catch {
    return atob(base64)
  }
}

function extractBodyText(payload: {
  body?: { data?: string }
  parts?: Array<{ mimeType?: string; body?: { data?: string }; parts?: unknown[] }>
}): string {
  if (!payload) return ""

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data)
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64Url(part.body.data)
      }
      if (part.parts) {
        const nestedBody = extractBodyText(
          part as {
            body?: { data?: string }
            parts?: Array<{
              mimeType?: string
              body?: { data?: string }
              parts?: unknown[]
            }>
          }
        )
        if (nestedBody) return nestedBody
      }
    }
  }

  return ""
}

const BATCH_SIZE = 10

// Exclude no-reply senders at the Gmail API query level so we never fetch them.
const INBOX_SYNC_QUERY =
  "is:unread label:INBOX newer_than:7d -from:noreply -from:no-reply"

Deno.serve(async () => {
  const supabase = createAdminClient()

  try {
    await ensureGmailAccessToken(supabase)

    const listResponse = await gmailFetch(
      supabase,
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(INBOX_SYNC_QUERY)}`
    )
    const listData = await listResponse.json()
    const messages = (listData.messages || []).slice(0, BATCH_SIZE)

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({
          status: "success",
          processed: 0,
          message: "Inbox is clean!",
        }),
        { headers: { "Content-Type": "application/json" } }
      )
    }

    console.log(`Processing ${messages.length} unread emails.`)
    let successfulSyncs = 0

    for (const msg of messages) {
      const detailResponse = await gmailFetch(
        supabase,
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`
      )
      const details = await detailResponse.json()

      const headers = details.payload?.headers || []
      const subject =
        headers.find((h: { name: string }) => h.name === "Subject")?.value ||
        "No Subject"
      const sender =
        headers.find((h: { name: string }) => h.name === "From")?.value ||
        "Unknown Sender"
      const bodyText = extractBodyText(details.payload)

      const { error: dbError } = await supabase.from("threads").upsert({
        id: details.threadId,
        sender,
        subject,
        snippet: details.snippet || "",
        body_text: bodyText,
        status: "PENDING",
      })

      if (dbError) {
        console.error(
          `Skipping message ${msg.id} due to DB error:`,
          dbError.message
        )
        continue
      }

      await gmailFetch(
        supabase,
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}/modify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
        }
      )

      successfulSyncs++
    }

    return new Response(
      JSON.stringify({ status: "success", processed: successfulSyncs }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Fatal runtime error:", message)
    return new Response(JSON.stringify({ error: message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
})
