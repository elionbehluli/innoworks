import { gmailFetch } from "@/lib/gmail/client"
import { createAdminClient } from "@/lib/utils/supabase/admin"

type GmailHeader = { name: string; value: string }

function encodeBase64Url(input: string): string {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
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

async function getThreadReplyHeaders(threadId: string): Promise<{
  messageId?: string
  references?: string
}> {
  const supabase = createAdminClient()

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

  const messages = (data.messages ?? []) as Array<{
    payload?: { headers?: GmailHeader[] }
  }>
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

export async function sendGmailReply(options: {
  threadId: string
  sender: string
  subject: string
  body: string
}): Promise<{ messageId: string }> {
  const supabase = createAdminClient()
  const { messageId, references } = await getThreadReplyHeaders(options.threadId)

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
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw,
        threadId: options.threadId,
      }),
    }
  )

  const data = await response.json()
  if (!response.ok) {
    throw new Error(
      `Failed to send Gmail reply: ${data?.error?.message ?? response.statusText}`
    )
  }

  if (!data.id) {
    throw new Error("Gmail send API returned no message id")
  }

  return { messageId: data.id as string }
}
