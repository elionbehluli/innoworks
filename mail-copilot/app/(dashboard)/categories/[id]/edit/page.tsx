import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { EditCategoryForm } from "@/components/categories/edit-category-form"
import { getSessionUser, getSupabase } from "@/lib/utils/supabase/auth"

const DELETED_STATUS_ID = 2

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await getSupabase()
  const user = await getSessionUser()

  const [{ data: profile }, { data: category }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase
      .from("categories")
      .select("id, name, routing_rule, prompt_template")
      .eq("id", id)
      .neq("status_id", DELETED_STATUS_ID)
      .single(),
  ])

  if (profile?.role !== "ADMIN") {
    redirect("/categories")
  }

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
