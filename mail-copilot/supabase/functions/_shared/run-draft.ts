/// <reference types="deno" />
import { createGmailDraftReply } from "./gmail-draft.ts"
import { draftEmailReply, type FewShotExample } from "./openai.ts"
import { fetchFewShotExamples, getLatestInboundText } from "./rag.ts"
import type { createAdminClient } from "./supabase-admin.ts"

const BATCH_SIZE = 3

type CategoryContext = {
  name: string
  prompt_template: string
}

type ThreadWithCategory = {
  id: string
  gmail_thread_id: string
  subject: string
  sender: string
  body_text: string | null
  snippet: string | null
  category_id: string
  categories:
    | CategoryContext
    | CategoryContext[]
    | null
}

export type DraftResult = {
  status: "success"
  processed: number
  failed: number
  failures: Array<{ threadId: string; error: string }>
  target_message_id: string | null
  message?: string
}

function getCategoryContext(
  categories: ThreadWithCategory["categories"]
): CategoryContext | null {
  if (!categories) return null
  if (Array.isArray(categories)) return categories[0] ?? null
  return categories
}

async function fetchFewShotExamplesSafe(
  supabase: ReturnType<typeof createAdminClient>,
  options: {
    sender: string
    categoryId: string
    inboundText: string
  }
): Promise<FewShotExample[]> {
  try {
    return await fetchFewShotExamples(supabase, options)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.warn(`RAG retrieval skipped: ${message}`)
    return []
  }
}

export async function runDraft(
  supabase: ReturnType<typeof createAdminClient>,
  options: { targetMessageId?: string | null } = {}
): Promise<DraftResult> {
  const targetMessageId = options.targetMessageId ?? null

  let threadsQuery = supabase
    .from("threads")
    .select(
      "id, gmail_thread_id, subject, sender, body_text, snippet, category_id, categories(name, prompt_template)"
    )

  if (targetMessageId) {
    threadsQuery = threadsQuery.eq("gmail_message_id", targetMessageId)
  } else {
    threadsQuery = threadsQuery
      .not("category_id", "is", null)
      .is("ai_draft_reply", null)
      .eq("status", "PENDING")
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE)
  }

  const { data: threads, error } = await threadsQuery

  if (error) {
    throw new Error(error.message)
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
        : "No message waiting for draft generation.",
    }
  }

  let processed = 0
  const failures: Array<{ threadId: string; error: string }> = []

  for (const thread of threads as ThreadWithCategory[]) {
    try {
      const category = getCategoryContext(thread.categories)

      if (!category?.prompt_template) {
        throw new Error(
          `Category ${thread.category_id} is missing or has no prompt template`
        )
      }

      const inboundText = getLatestInboundText(thread)
      const fewShotExamples = await fetchFewShotExamplesSafe(supabase, {
        sender: thread.sender,
        categoryId: thread.category_id,
        inboundText,
      })

      console.log(
        `Thread ${thread.id}: retrieved ${fewShotExamples.length} few-shot example(s)`
      )

      const draftReply = await draftEmailReply(thread, category, fewShotExamples)

      const { error: updateError } = await supabase
        .from("threads")
        .update({ ai_draft_reply: draftReply })
        .eq("id", thread.id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      try {
        const { draftId } = await createGmailDraftReply(supabase, {
          threadId: thread.gmail_thread_id,
          sender: thread.sender,
          subject: thread.subject,
          body: draftReply,
        })
        console.log(`Thread ${thread.id} draft generated (Gmail draft ${draftId})`)
      } catch (gmailError) {
        const message =
          gmailError instanceof Error ? gmailError.message : "Unknown error"
        console.warn(
          `Thread ${thread.id}: Gmail draft creation failed (reply saved to DB): ${message}`
        )
      }

      processed++
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      failures.push({ threadId: thread.id, error: message })
      console.error(`Failed to draft reply for thread ${thread.id}:`, message)
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
