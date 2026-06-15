/// <reference types="deno" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4"

export function createAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )
}
