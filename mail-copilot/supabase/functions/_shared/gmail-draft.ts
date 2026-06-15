/// <reference types="deno" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4"
import { gmailFetch } from "./gmail-token.ts"

type SupabaseClient = ReturnType<typeof createClient>

type GmailHeader = { name: string; value: string }

function encodeBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function parseEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/)
  return (match ? match[1] : from).trim()
}

function replySubject(subject: string): string {
  return /^re:/i.test(subject.trim()) ? subject : `Re: ${subject}`
}

function getHeader(headers: GmailHeader[], name: string): string | undefined {
  return headers.find((header) => header.name.toLowerCase() === name.toLowerCase())
    ?.value
}

async function getThreadReplyHeaders(
  supabase: SupabaseClient,
  threadId: string
): Promise<{ messageId?: string; references?: string }> {
  const response = await gmailFetch(
    supabase,
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=metadata&metadataHeaders=Message-ID&metadataHeaders=References`
  )

  const data = await response.json()
  if (!response.ok) {
    throw new Error(
      `Failed to fetch Gmail thread ${threadId}: ${data?.error?.message ?? response.statusText}`
    )
  }

  const messages = (data.messages ?? []) as Array<{ payload?: { headers?: GmailHeader[] } }>
  const latestMessage = messages.at(-1)
  const headers = latestMessage?.payload?.headers ?? []

  return {
    messageId: getHeader(headers, "Message-ID"),
    references: getHeader(headers, "References"),
  }
}

function buildRawReplyMessage(options: {
  to: string
  subject: string
  body: string
  messageId?: string
  references?: string
}): string {
  const lines = [
    `To: ${options.to}`,
    `Subject: ${replySubject(options.subject)}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "MIME-Version: 1.0",
  ]

  if (options.messageId) {
    lines.push(`In-Reply-To: ${options.messageId}`)
    const references = options.references
      ? `${options.references} ${options.messageId}`
      : options.messageId
    lines.push(`References: ${references}`)
  }

  return `${lines.join("\r\n")}\r\n\r\n${options.body}`
}

export async function createGmailDraftReply(
  supabase: SupabaseClient,
  options: {
    threadId: string
    sender: string
    subject: string
    body: string
  }
): Promise<{ draftId: string }> {
  const { messageId, references } = await getThreadReplyHeaders(
    supabase,
    options.threadId
  )

  const raw = encodeBase64Url(
    buildRawReplyMessage({
      to: parseEmailAddress(options.sender),
      subject: options.subject,
      body: options.body,
      messageId,
      references,
    })
  )

  const response = await gmailFetch(
    supabase,
    "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          raw,
          threadId: options.threadId,
        },
      }),
    }
  )

  const data = await response.json()
  if (!response.ok) {
    throw new Error(
      `Failed to create Gmail draft: ${data?.error?.message ?? response.statusText}`
    )
  }

  if (!data.id) {
    throw new Error("Gmail draft API returned no draft id")
  }

  return { draftId: data.id as string }
}
