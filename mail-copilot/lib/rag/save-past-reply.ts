import type { SupabaseClient } from "@supabase/supabase-js"

import { createEmbedding } from "@/lib/openai/embeddings"
import type { Database, Json } from "@/lib/utils/supabase/types"

type AppSupabaseClient = SupabaseClient<Database>

export type ThreadHistoryMessage = {
  role: "user" | "assistant"
  content: string
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

export async function getExistingThreadHistory(
  supabase: AppSupabaseClient,
  gmailThreadId: string
): Promise<ThreadHistoryMessage[]> {
  const { data, error } = await supabase
    .from("past_replies")
    .select("thread_history")
    .eq("thread_id", gmailThreadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch thread history: ${error.message}`)
  }

  return parseThreadHistory(data?.thread_history)
}

export function buildFullThreadHistory(
  existingHistory: ThreadHistoryMessage[],
  inboundEmail: string,
  outboundReply: string
): ThreadHistoryMessage[] {
  return [
    ...existingHistory,
    { role: "user", content: inboundEmail },
    { role: "assistant", content: outboundReply },
  ]
}

export async function savePastReply(
  supabase: AppSupabaseClient,
  options: {
    gmailThreadId: string
    sender: string
    categoryId: string
    inboundEmail: string
    outboundReply: string
    threadHistory: ThreadHistoryMessage[]
  }
): Promise<void> {
  const inboundEmail = options.inboundEmail.trim()
  const outboundReply = options.outboundReply.trim()

  if (!inboundEmail) {
    throw new Error("Cannot save past reply without inbound email text.")
  }

  if (!outboundReply) {
    throw new Error("Cannot save past reply without outbound reply text.")
  }

  if (!Array.isArray(options.threadHistory)) {
    throw new Error("Thread history must be a valid JSON array.")
  }

  // Embedding is required by schema (vector(1536)); generated from latest inbound only.
  const embedding = await createEmbedding(inboundEmail)

  const { error } = await supabase.from("past_replies").insert({
    thread_id: options.gmailThreadId,
    sender: options.sender,
    category_id: options.categoryId,
    thread_history: options.threadHistory as Json,
    inbound_email: inboundEmail,
    outbound_reply: outboundReply,
    embedding,
  })

  if (error) {
    throw new Error(`Failed to save past reply: ${error.message}`)
  }
}

export function getLatestInboundText(thread: {
  body_text: string | null
  snippet: string | null
}): string {
  return thread.body_text?.trim() || thread.snippet?.trim() || ""
}
