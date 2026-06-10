import Link from "next/link"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { EditCategoryForm } from "@/components/categories/edit-category-form"
import { createClient } from "@/lib/utils/supabase/server"

const DELETED_STATUS_ID = 2

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

  const { data: category } = await supabase
    .from("categories")
    .select("id, name, routing_rule, prompt_template")
    .eq("id", id)
    .neq("status_id", DELETED_STATUS_ID)
    .single()

  if (!category) {
    notFound()
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
        <h1 className="text-2xl font-medium">Modify category</h1>
      </div>

      <EditCategoryForm category={category} />
    </div>
  )
}
