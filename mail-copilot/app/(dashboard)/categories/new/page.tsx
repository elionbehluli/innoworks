import Link from "next/link"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { CreateCategoryForm } from "@/components/categories/create-category-form"
import { createClient } from "@/lib/utils/supabase/server"

export default async function NewCategoryPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single()

  if (profile?.role !== "ADMIN") {
    redirect("/categories")
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/categories"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to categories
        </Link>
        <h1 className="text-2xl font-medium">Create category</h1>
      </div>

      <CreateCategoryForm />
    </div>
  )
}
