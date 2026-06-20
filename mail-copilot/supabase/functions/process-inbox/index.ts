/// <reference types="deno" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { runCategorise } from "../_shared/run-categorise.ts"
import { runDraft } from "../_shared/run-draft.ts"
import { runSyncGmail } from "../_shared/run-sync-gmail.ts"
import { createAdminClient } from "../_shared/supabase-admin.ts"

type StageResult<T> =
  | { status: "success"; result: T }
  | { status: "error"; error: string }

async function runStage<T>(
  stageName: string,
  fn: () => Promise<T>
): Promise<StageResult<T>> {
  try {
    const result = await fn()
    return { status: "success", result }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error(`${stageName} stage failed:`, message)
    return { status: "error", error: message }
  }
}

Deno.serve(async () => {
  const supabase = createAdminClient()

  const sync = await runStage("Sync", () => runSyncGmail(supabase))
  const categorise = await runStage("Categorise", () => runCategorise(supabase))
  const draft = await runStage("Draft", () => runDraft(supabase))

  const hasError =
    sync.status === "error" ||
    categorise.status === "error" ||
    draft.status === "error"

  return new Response(
    JSON.stringify({
      status: hasError ? "partial" : "success",
      sync,
      categorise,
      draft,
    }),
    {
      headers: { "Content-Type": "application/json" },
      status: hasError ? 207 : 200,
    }
  )
})
