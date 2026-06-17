/// <reference types="deno" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4"

import { createEmbedding, type FewShotExample } from "./openai.ts"

type SupabaseClient = ReturnType<typeof createClient>

const RAG_MATCH_THRESHOLD = 0.75
const RAG_MATCH_COUNT = 2

export function getLatestInboundText(thread: {
  body_text: string | null
  snippet: string | null
}): string {
  const text = thread.body_text?.trim() || thread.snippet?.trim()
  if (!text) {
    throw new Error("Thread has no inbound message text to embed")
  }
  return text
}

export async function fetchFewShotExamples(
  supabase: SupabaseClient,
  options: {
    sender: string
    categoryId: string
    inboundText: string
  }
): Promise<FewShotExample[]> {
  const queryEmbedding = await createEmbedding(options.inboundText)

  const { data, error } = await supabase.rpc("get_best_few_shot_examples", {
    query_embedding: queryEmbedding,
    match_threshold: RAG_MATCH_THRESHOLD,
    match_count: RAG_MATCH_COUNT,
    target_sender: options.sender,
    target_category: options.categoryId,
  })

  if (error) {
    throw new Error(`RAG retrieval failed: ${error.message}`)
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    thread_history: Array.isArray(row.thread_history) ? row.thread_history : [],
    inbound_email: String(row.inbound_email ?? ""),
    outbound_reply: String(row.outbound_reply ?? ""),
    similarity: Number(row.similarity),
    match_level: String(row.match_level ?? ""),
  })) as FewShotExample[]
}
