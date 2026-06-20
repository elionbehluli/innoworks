import Link from "next/link"
import { redirect } from "next/navigation"

import { CreateCategoryForm } from "@/components/categories/create-category-form"
import { getProfile } from "@/lib/utils/supabase/auth"

export default async function NewCategoryPage() {
  const profile = await getProfile()

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
