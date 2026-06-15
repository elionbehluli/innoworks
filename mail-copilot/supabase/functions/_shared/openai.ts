/// <reference types="deno" />

const DEFAULT_MODEL = "gpt-4o-mini"
const MAX_BODY_CHARS = 4000

type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export type CategoryOption = {
  id: string
  name: string
  routing_rule: string
}

function getOpenAiKey(): string {
  const apiKey = Deno.env.get("OPENAI_API_KEY")
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set")
  }
  return apiKey
}

function getModel(): string {
  return Deno.env.get("OPENAI_MODEL") ?? DEFAULT_MODEL
}

function truncate(text: string | null | undefined, max = MAX_BODY_CHARS): string {
  if (!text) return ""
  return text.length > max ? `${text.slice(0, max)}...` : text
}

export async function chatJson<T>(
  messages: ChatMessage[],
  options?: { model?: string }
): Promise<T> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenAiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options?.model ?? getModel(),
      messages,
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      `OpenAI request failed: ${data?.error?.message ?? response.statusText}`
    )
  }

  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error("OpenAI returned an empty response")
  }

  return JSON.parse(content) as T
}

export async function categorizeEmail(
  thread: {
    subject: string
    sender: string
    body_text: string | null
    snippet: string | null
  },
  categories: CategoryOption[]
): Promise<string> {
  if (categories.length === 0) {
    throw new Error("No active categories available for categorisation")
  }

  const categoryList = categories
    .map(
      (category) =>
        `- id: ${category.id}\n  name: ${category.name}\n  routing_rule: ${category.routing_rule}`
    )
    .join("\n")

  const emailContent = [
    `From: ${thread.sender}`,
    `Subject: ${thread.subject}`,
    `Snippet: ${thread.snippet ?? ""}`,
    `Body: ${truncate(thread.body_text)}`,
  ].join("\n")

  const result = await chatJson<{ category_id: string }>([
    {
      role: "system",
      content: [
        "You classify incoming emails into exactly one category.",
        "Use the category routing rules to decide the best match.",
        'Respond with JSON only: {"category_id":"<uuid>"}',
        "The category_id must be one of the provided ids.",
      ].join(" "),
    },
    {
      role: "user",
      content: `Categories:\n${categoryList}\n\nEmail:\n${emailContent}`,
    },
  ])

  const matchedCategory = categories.find(
    (category) => category.id === result.category_id
  )

  if (!matchedCategory) {
    throw new Error(
      `OpenAI returned invalid category_id: ${result.category_id ?? "missing"}`
    )
  }

  return matchedCategory.id
}

export type CategoryDraftContext = {
  name: string
  prompt_template: string
}

export async function draftEmailReply(
  thread: {
    subject: string
    sender: string
    body_text: string | null
    snippet: string | null
  },
  category: CategoryDraftContext
): Promise<string> {
  const emailContent = [
    `From: ${thread.sender}`,
    `Subject: ${thread.subject}`,
    `Snippet: ${thread.snippet ?? ""}`,
    `Body: ${truncate(thread.body_text)}`,
  ].join("\n")

  const result = await chatJson<{ draft_reply: string }>([
    {
      role: "system",
      content: [
        "You write professional email reply drafts for a support team.",
        "Follow the category-specific instructions exactly.",
        "Write only the reply body text that a human can review, edit, and send.",
        "Do not include a subject line or email headers.",
        'Respond with JSON only: {"draft_reply":"<plain text reply body>"}',
      ].join(" "),
    },
    {
      role: "user",
      content: [
        `Category: ${category.name}`,
        "Instructions:",
        category.prompt_template,
        "",
        "Incoming email:",
        emailContent,
      ].join("\n"),
    },
  ])

  const draftReply = result.draft_reply?.trim()
  if (!draftReply) {
    throw new Error("OpenAI returned an empty draft reply")
  }

  return draftReply
}
