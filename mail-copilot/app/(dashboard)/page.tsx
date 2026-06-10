import { cookies } from "next/headers"

import { createClient } from "@/lib/utils/supabase/server"

export default async function HomePage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user!.id)
    .single()

  return (
    <>
    <h1 className="text-2xl font-medium">
      hi {profile?.display_name ?? "there"}
    </h1>
    <h5>You are a {profile?.role ?? "staff"}</h5>
    </>
    
    
  )
}
