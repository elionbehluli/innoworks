import Link from "next/link"

import { CategoryActions } from "@/components/categories/category-actions"
import { CategoryReorderButtons } from "@/components/categories/category-reorder-buttons"
import {
  CategoriesPagination,
  PAGE_SIZE,
} from "@/components/categories/categories-pagination"
import { Button } from "@/components/ui/button"
import { getSessionUser, getSupabase } from "@/lib/utils/supabase/auth"

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

  const supabase = await getSupabase()
  const user = await getSessionUser()

  const [{ data: profile }, { data: categories, count }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase
      .from("categories")
      .select("id, name, routing_rule, sort_order, statuses(name)", { count: "exact" })
      .neq("status_id", DELETED_STATUS_ID)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .range(from, to),
  ])

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
                    AI routing description
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  {isAdmin && <th className="px-4 py-3 text-right">Order</th>}
                  {isAdmin && <th className="px-4 py-3 text-right" />}
                </tr>
              </thead>
              <tbody>
                {categories.map((category, index) => (
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
                        <CategoryReorderButtons
                          categoryId={category.id}
                          isFirst={index === 0}
                          isLast={index === categories.length - 1}
                        />
                      </td>
                    )}
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
