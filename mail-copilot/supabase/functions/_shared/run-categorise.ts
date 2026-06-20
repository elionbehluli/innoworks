/// <reference types="deno" />
import { categorizeEmail } from "./openai.ts"
import type { createAdminClient } from "./supabase-admin.ts"

const BATCH_SIZE = 3
const ACTIVE_CATEGORY_STATUS_ID = 1

export type CategoriseResult = {
  status: "success"
  processed: number
  failed: number
  failures: Array<{ threadId: string; error: string }>
  target_message_id: string | null
  message?: string
}

export async function runCategorise(
  supabase: ReturnType<typeof createAdminClient>,
  options: { targetMessageId?: string | null } = {}
): Promise<CategoriseResult> {
  const targetMessageId = options.targetMessageId ?? null

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name, routing_rule")
    .eq("status_id", ACTIVE_CATEGORY_STATUS_ID)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })

  if (categoriesError) {
    throw new Error(categoriesError.message)
  }

  if (!categories?.length) {
    return {
      status: "success",
      processed: 0,
      failed: 0,
      failures: [],
      target_message_id: targetMessageId,
      message: "No active categories configured.",
    }
  }

  let threadsQuery = supabase
    .from("threads")
    .select("id, subject, sender, body_text, snippet")

  if (targetMessageId) {
    threadsQuery = threadsQuery.eq("gmail_message_id", targetMessageId)
  } else {
    threadsQuery = threadsQuery
      .is("category_id", null)
      .eq("status", "PENDING")
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE)
  }

  const { data: threads, error: threadsError } = await threadsQuery

  if (threadsError) {
    throw new Error(threadsError.message)
  }

  if (!threads?.length) {
    return {
      status: "success",
      processed: 0,
      failed: 0,
      failures: [],
      target_message_id: targetMessageId,
      message: targetMessageId
        ? `Message ${targetMessageId} was not found.`
        : "No threads waiting for categorisation.",
    }
  }

  let processed = 0
  const failures: Array<{ threadId: string; error: string }> = []

  for (const thread of threads) {
    try {
      const categoryId = await categorizeEmail(thread, categories)

      const { error: updateError } = await supabase
        .from("threads")
        .update({ category_id: categoryId })
        .eq("id", thread.id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      processed++
      console.log(`Thread ${thread.id} categorised as ${categoryId}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      failures.push({ threadId: thread.id, error: message })
      console.error(`Failed to categorise thread ${thread.id}:`, message)
    }
  }

  return {
    status: "success",
    processed,
    failed: failures.length,
    failures,
    target_message_id: targetMessageId,
  }
}
