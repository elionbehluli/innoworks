/// <reference types="deno" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { categorizeEmail } from "../_shared/openai.ts"
import { getOptionalMessageId } from "../_shared/request-params.ts"
import { createAdminClient } from "../_shared/supabase-admin.ts"

const BATCH_SIZE = 3
const ACTIVE_CATEGORY_STATUS_ID = 1

Deno.serve(async (req) => {
  const supabase = createAdminClient()
  const targetMessageId = await getOptionalMessageId(req)

  try {
    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("id, name, routing_rule")
      .eq("status_id", ACTIVE_CATEGORY_STATUS_ID)
      .order("name")

    if (categoriesError) {
      throw new Error(categoriesError.message)
    }

    if (!categories?.length) {
      return new Response(
        JSON.stringify({
          status: "success",
          processed: 0,
          message: "No active categories configured.",
        }),
        { headers: { "Content-Type": "application/json" } }
      )
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
      return new Response(
        JSON.stringify({
          status: "success",
          processed: 0,
          target_message_id: targetMessageId,
          message: targetMessageId
            ? `Messsage ${targetMessageId} was not found.`
            : "No threads waiting for categorisation.",
        }),
        { headers: { "Content-Type": "application/json" } }
      )
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

    return new Response(
      JSON.stringify({
        status: "success",
        processed,
        failed: failures.length,
        failures,
        target_message_id: targetMessageId,
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
