import Link from "next/link"

import { Button } from "@/components/ui/button"

const PAGE_SIZE = 7

export function CategoriesPagination({
  page,
  totalCount,
}: {
  page: number
  totalCount: number
}) {
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/categories?page=${page - 1}`}>Previous</Link>
          </Button>
        )}
        {page < totalPages && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/categories?page=${page + 1}`}>Next</Link>
          </Button>
        )}
      </div>
    </div>
  )
}

export { PAGE_SIZE }
