/// <reference types="deno" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { runCategorise } from "../_shared/run-categorise.ts"
import { getOptionalMessageId } from "../_shared/request-params.ts"
import { createAdminClient } from "../_shared/supabase-admin.ts"

Deno.serve(async (req) => {
  const supabase = createAdminClient()
  const targetMessageId = await getOptionalMessageId(req)

  try {
    const result = await runCategorise(supabase, { targetMessageId })

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Fatal runtime error:", message)
    return new Response(JSON.stringify({ error: message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
})
