import { getProfile } from "@/lib/utils/supabase/auth"

export default async function HomePage() {
  const profile = await getProfile()

  return (
    <>
    <h1 className="text-2xl font-medium">
      hi {profile?.display_name ?? "there"}
    </h1>
    <h5>You are a {profile?.role ?? "staff"}</h5>
    </>
    
    
  )
}
