"use client"

import Link from "next/link"
import { MoreHorizontal } from "lucide-react"
import { useTransition } from "react"

import {
  deleteCategory,
  inactivateCategory,
} from "@/app/(dashboard)/categories/actions"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function CategoryActions({
  categoryId,
  isAdmin,
}: {
  categoryId: string
  isAdmin: boolean
}) {
  const [isPending, startTransition] = useTransition()

  if (!isAdmin) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" disabled={isPending}>
          <MoreHorizontal />
          <span className="sr-only">Open actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/categories/${categoryId}/edit`}>Modify</Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            startTransition(async () => {
              await inactivateCategory(categoryId)
            })
          }
        >
          Inactivate
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() =>
            startTransition(async () => {
              await deleteCategory(categoryId)
            })
          }
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
