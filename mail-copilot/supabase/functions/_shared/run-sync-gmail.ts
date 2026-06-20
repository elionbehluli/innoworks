/// <reference types="deno" />
import { ensureGmailAccessToken, gmailFetch } from "./gmail-token.ts"
import type { createAdminClient } from "./supabase-admin.ts"

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

const INBOX_SYNC_QUERY =
  "is:unread label:INBOX newer_than:7d -from:noreply -from:no-reply"

export type SyncGmailResult = {
  status: "success"
  processed: number
  message?: string
}

export async function runSyncGmail(
  supabase: ReturnType<typeof createAdminClient>
): Promise<SyncGmailResult> {
  await ensureGmailAccessToken(supabase)

  const listResponse = await gmailFetch(
    supabase,
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(INBOX_SYNC_QUERY)}`
  )
  const listData = await listResponse.json()
  const messages = (listData.messages || []).slice(0, BATCH_SIZE)

  if (messages.length === 0) {
    return {
      status: "success",
      processed: 0,
      message: "Inbox is clean!",
    }
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

    const { error: dbError } = await supabase.from("threads").upsert(
      {
        gmail_thread_id: details.threadId,
        gmail_message_id: details.id,
        sender,
        subject,
        snippet: details.snippet || "",
        body_text: bodyText,
        status: "PENDING",
      },
      { onConflict: "gmail_message_id", ignoreDuplicates: true }
    )

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

  return { status: "success", processed: successfulSyncs }
}
