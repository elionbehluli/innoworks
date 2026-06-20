"use client"

import { ChevronDown, ChevronUp } from "lucide-react"
import { useTransition } from "react"

import { moveCategory } from "@/app/(dashboard)/categories/actions"
import { Button } from "@/components/ui/button"

export function CategoryReorderButtons({
  categoryId,
  isFirst,
  isLast,
}: {
  categoryId: string
  isFirst: boolean
  isLast: boolean
}) {
  const [isPending, startTransition] = useTransition()

  function handleMove(direction: "up" | "down") {
    startTransition(async () => {
      await moveCategory(categoryId, direction)
    })
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={isPending || isFirst}
        onClick={() => handleMove("up")}
        aria-label="Move category up"
      >
        <ChevronUp />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={isPending || isLast}
        onClick={() => handleMove("down")}
        aria-label="Move category down"
      >
        <ChevronDown />
      </Button>
    </div>
  )
}
