declare module "https://esm.sh/@supabase/supabase-js@2.43.4" {
  export type { SupabaseClient } from "@supabase/supabase-js"

  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: Record<string, unknown>
  ): import("@supabase/supabase-js").SupabaseClient
}

declare module "jsr:@supabase/functions-js/edge-runtime.d.ts" {}
