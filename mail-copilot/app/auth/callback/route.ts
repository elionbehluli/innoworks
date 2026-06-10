import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { createClient } from "@/lib/utils/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle()

        if (!profile) {
          await supabase.from("profiles").insert({
            id: user.id,
            display_name:
              user.user_metadata.full_name ??
              user.user_metadata.name ??
              user.email,
            avatar_url: user.user_metadata.avatar_url ?? null,
          })
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth`)
}
