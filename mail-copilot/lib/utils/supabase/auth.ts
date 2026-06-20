import { cache } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { createClient } from "./server"

/** Supabase client for the current request (deduplicated via React cache). */
export const getSupabase = cache(async () => {
  const cookieStore = await cookies()
  return createClient(cookieStore)
})

/**
 * Reads the session from cookies. Middleware already calls getUser() to
 * validate and refresh the session, so this avoids a second network round-trip.
 */
export const getSessionUser = cache(async () => {
  const supabase = await getSupabase()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.user ?? null
})

export const getProfile = cache(async () => {
  const user = await getSessionUser()
  if (!user) return null

  const supabase = await getSupabase()
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .single()

  return profile
})

export async function requireAdmin() {
  const user = await getSessionUser()
  if (!user) redirect("/sign-in")

  const profile = await getProfile()
  if (profile?.role !== "ADMIN") redirect("/categories")

  return await getSupabase()
}
