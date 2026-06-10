import Link from "next/link"
import { cookies } from "next/headers"

import { CategoryActions } from "@/components/categories/category-actions"
import {
  CategoriesPagination,
  PAGE_SIZE,
} from "@/components/categories/categories-pagination"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/utils/supabase/server"

const DELETED_STATUS_ID = 2

function getStatusName(
  statuses: { name: string } | { name: string }[] | null | undefined
) {
  if (!statuses) return "unknown"
  if (Array.isArray(statuses)) return statuses[0]?.name ?? "unknown"
  return statuses.name
}

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

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

  const { data: categories, count } = await supabase
    .from("categories")
    .select("id, name, routing_rule, statuses(name)", { count: "exact" })
    .neq("status_id", DELETED_STATUS_ID)
    .order("name")
    .range(from, to)

  const isAdmin = profile?.role === "ADMIN"
  const totalCount = count ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium">Categories</h1>
        {isAdmin && (
          <Button asChild>
            <Link href="/categories/new">Create</Link>
          </Button>
        )}
      </div>

      {categories && categories.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">
                    Routing rule
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  {isAdmin && <th className="px-4 py-3 text-right" />}
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr
                    key={category.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3 font-medium">{category.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {category.routing_rule}
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">
                      {getStatusName(
                        category.statuses as
                          | { name: string }
                          | { name: string }[]
                          | null
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <CategoryActions
                          categoryId={category.id}
                          isAdmin={isAdmin}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <CategoriesPagination page={page} totalCount={totalCount} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {totalCount > 0 && page > 1
            ? "No categories on this page."
            : "No categories yet."}
        </p>
      )}
    </div>
  )
}
