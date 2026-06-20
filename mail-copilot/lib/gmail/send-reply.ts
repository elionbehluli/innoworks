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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
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

function buildHtmlBody(
  body: string,
  trackingToken: string,
  sentAt: string
): string {
  const appUrl = getAppUrl()
  const htmlBody = escapeHtml(body).replace(/\n/g, "<br>")
  const pixelUrl = `${appUrl}/api/track/open/${trackingToken}.gif?sent=${encodeURIComponent(sentAt)}`

  return [
    "<html>",
    "<body>",
    `<div>${htmlBody}</div>`,
    "<!-- Open tracking: server ignores pixel hits within 5s of send (Gmail prefetch) -->",
    `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none!important;visibility:hidden;border:0" />`,
    "</body>",
    "</html>",
  ].join("")
}

function buildRawReplyMessage(options: {
  to: string
  subject: string
  body: string
  trackingToken: string
  sentAt: string
  messageId?: string
  references?: string
}): string {
  const boundary = `mail_copilot_${Date.now()}`
  const headers = [
    `To: ${options.to}`,
    `Subject: ${replySubject(options.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ]

  if (options.messageId) {
    headers.push(`In-Reply-To: ${options.messageId}`)
    const references = options.references
      ? `${options.references} ${options.messageId}`
      : options.messageId
    headers.push(`References: ${references}`)
  }

  const plainPart = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    options.body,
  ].join("\r\n")

  const htmlPart = [
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "",
    buildHtmlBody(options.body, options.trackingToken, options.sentAt),
  ].join("\r\n")

  return `${headers.join("\r\n")}\r\n\r\n${plainPart}\r\n${htmlPart}\r\n--${boundary}--\r\n`
}

export async function sendGmailReply(options: {
  threadId: string
  sender: string
  subject: string
  body: string
  trackingToken: string
  sentAt: string
}): Promise<{ messageId: string }> {
  const supabase = createAdminClient()
  const { messageId, references } = await getThreadReplyHeaders(options.threadId)

  const raw = encodeBase64Url(
    buildRawReplyMessage({
      to: parseEmailAddress(options.sender),
      subject: options.subject,
      body: options.body,
      trackingToken: options.trackingToken,
      sentAt: options.sentAt,
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
