/// <reference types="deno" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { runSyncGmail } from "../_shared/run-sync-gmail.ts"
import { createAdminClient } from "../_shared/supabase-admin.ts"

Deno.serve(async () => {
  const supabase = createAdminClient()

  try {
    const result = await runSyncGmail(supabase)

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
      status: 200,
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
