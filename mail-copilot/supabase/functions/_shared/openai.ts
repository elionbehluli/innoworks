/// <reference types="deno" />

const DEFAULT_MODEL = "gpt-4o-mini"
const EMBEDDING_MODEL = "text-embedding-3-small"
const EMBEDDING_DIMENSIONS = 1536
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

export type ThreadHistoryMessage = {
  role: "user" | "assistant"
  content: string
}

export type FewShotExample = {
  id: string
  thread_history: ThreadHistoryMessage[]
  inbound_email: string
  outbound_reply: string
  similarity: number
  match_level: string
}

export async function createEmbedding(text: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenAiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      `OpenAI embedding request failed: ${data?.error?.message ?? response.statusText}`
    )
  }

  const embedding = data.data?.[0]?.embedding as number[] | undefined
  if (!embedding?.length) {
    throw new Error("OpenAI returned an empty embedding")
  }

  return JSON.stringify(embedding)
}

function parseThreadHistory(value: unknown): ThreadHistoryMessage[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((entry) => {
    if (
      typeof entry === "object" &&
      entry !== null &&
      (entry.role === "user" || entry.role === "assistant") &&
      typeof entry.content === "string"
    ) {
      return [{ role: entry.role, content: entry.content }]
    }
    return []
  })
}

function normalizeForComparison(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim()
}

function looksLikeEchoReply(draft: string, inbound: string): boolean {
  const normalizedDraft = normalizeForComparison(draft)
  const normalizedInbound = normalizeForComparison(inbound)

  if (!normalizedDraft || !normalizedInbound) return false
  if (normalizedDraft === normalizedInbound) return true

  const shorter = Math.min(normalizedDraft.length, normalizedInbound.length)
  const longer = Math.max(normalizedDraft.length, normalizedInbound.length)
  if (longer === 0) return false

  const contained =
    normalizedInbound.includes(normalizedDraft) ||
    normalizedDraft.includes(normalizedInbound)

  return contained && shorter / longer > 0.8
}

function buildDraftMessages(
  thread: {
    subject: string
    sender: string
    body_text: string | null
    snippet: string | null
  },
  category: CategoryDraftContext,
  fewShotExamples: FewShotExample[]
): ChatMessage[] {
  const inboundBody = truncate(thread.body_text) || thread.snippet?.trim() || ""
  const clientEmail = [
    `From: ${thread.sender}`,
    `Subject: ${thread.subject}`,
    `Body: ${inboundBody}`,
  ].join("\n")

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: [
        "You draft outbound email replies on behalf of the business mailbox owner (the agent, e.g. Joris the real estate agent).",
        "Messages from customers are labeled [CLIENT]. Replies sent by the business are labeled [AGENT].",
        "Your job is always to write the next [AGENT] reply to the client's request.",
        "Never repeat, copy, or paraphrase the [CLIENT] message as your output.",
        "Address the client's request directly with a helpful professional reply.",
        "Match the language the client used when possible (e.g. Dutch client → Dutch reply).",
        `Category: ${category.name}`,
        "Category instructions:",
        category.prompt_template,
        'For the final task only, respond with JSON: {"draft_reply":"<agent reply body>"}',
        "The draft_reply must contain only the agent's reply body. No subject line or email headers.",
      ].join("\n"),
    },
  ]

  for (const example of fewShotExamples) {
    for (const message of parseThreadHistory(example.thread_history)) {
      const label = message.role === "user" ? "[CLIENT]" : "[AGENT]"
      messages.push({
        role: message.role,
        content: `${label}\n${message.content}`,
      })
    }

    messages.push({
      role: "user",
      content: `[CLIENT]\n${example.inbound_email}`,
    })
    messages.push({
      role: "assistant",
      content: example.outbound_reply,
    })
  }

  messages.push({
    role: "user",
    content: [
      "[TASK] Write the [AGENT] reply to this [CLIENT] email.",
      "Do not repeat the client's wording. Offer a proper response from the agent.",
      "",
      clientEmail,
      "",
      'Respond with JSON only: {"draft_reply":"<agent reply body>"}',
    ].join("\n"),
  })

  return messages
}

export async function draftEmailReply(
  thread: {
    subject: string
    sender: string
    body_text: string | null
    snippet: string | null
  },
  category: CategoryDraftContext,
  fewShotExamples: FewShotExample[] = []
): Promise<string> {
  const inboundBody = thread.body_text?.trim() || thread.snippet?.trim() || ""
  const messages = buildDraftMessages(thread, category, fewShotExamples)

  const result = await chatJson<{ draft_reply: string }>(messages)

  const draftReply = result.draft_reply?.trim()
  if (!draftReply) {
    throw new Error("OpenAI returned an empty draft reply")
  }

  if (looksLikeEchoReply(draftReply, inboundBody)) {
    throw new Error(
      "OpenAI returned a draft that mirrors the incoming email instead of replying to it"
    )
  }

  return draftReply
}
