/// <reference types="deno" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createGmailDraftReply } from "../_shared/gmail-draft.ts"
import { ensureGmailAccessToken } from "../_shared/gmail-token.ts"
import { draftEmailReply } from "../_shared/openai.ts"
import { fetchFewShotExamples, getLatestInboundText } from "../_shared/rag.ts"
import { getOptionalThreadId } from "../_shared/request-params.ts"
import { createAdminClient } from "../_shared/supabase-admin.ts"

const BATCH_SIZE = 3

type ThreadWithCategory = {
  id: string
  subject: string
  sender: string
  body_text: string | null
  snippet: string | null
  category_id: string
  categories: {
    name: string
    prompt_template: string
  } | null
}

Deno.serve(async (req) => {
  const supabase = createAdminClient()
  const targetThreadId = await getOptionalThreadId(req)

  try {
    await ensureGmailAccessToken(supabase)

    let threadsQuery = supabase
      .from("threads")
      .select(
        "id, subject, sender, body_text, snippet, category_id, categories(name, prompt_template)"
      )

    if (targetThreadId) {
      threadsQuery = threadsQuery.eq("id", targetThreadId)
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
      return new Response(
        JSON.stringify({
          status: "success",
          processed: 0,
          target_thread_id: targetThreadId,
          message: targetThreadId
            ? `Thread ${targetThreadId} was not found.`
            : "No threads waiting for draft generation.",
        }),
        { headers: { "Content-Type": "application/json" } }
      )
    }

    let processed = 0
    const failures: Array<{ threadId: string; error: string }> = []

    for (const thread of threads as ThreadWithCategory[]) {
      try {
        if (!thread.categories?.prompt_template) {
          throw new Error(
            `Category ${thread.category_id} is missing or has no prompt template`
          )
        }

        const inboundText = getLatestInboundText(thread)
        const fewShotExamples = await fetchFewShotExamples(supabase, {
          sender: thread.sender,
          categoryId: thread.category_id,
          inboundText,
        })

        console.log(
          `Thread ${thread.id}: retrieved ${fewShotExamples.length} few-shot example(s)`
        )

        const draftReply = await draftEmailReply(
          thread,
          thread.categories,
          fewShotExamples
        )

        const { draftId } = await createGmailDraftReply(supabase, {
          threadId: thread.id,
          sender: thread.sender,
          subject: thread.subject,
          body: draftReply,
        })

        const { error: updateError } = await supabase
          .from("threads")
          .update({ ai_draft_reply: draftReply })
          .eq("id", thread.id)

        if (updateError) {
          throw new Error(updateError.message)
        }

        processed++
        console.log(`Thread ${thread.id} draft generated (Gmail draft ${draftId})`)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        failures.push({ threadId: thread.id, error: message })
        console.error(`Failed to draft reply for thread ${thread.id}:`, message)
      }
    }

    return new Response(
      JSON.stringify({
        status: "success",
        processed,
        failed: failures.length,
        failures,
        target_thread_id: targetThreadId,
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Fatal runtime error:", message)
    return new Response(JSON.stringify({ error: message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
})
