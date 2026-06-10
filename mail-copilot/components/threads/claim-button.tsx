"use client"

import { useTransition } from "react"

import { claimThread } from "@/app/(dashboard)/threads/actions"
import { Button } from "@/components/ui/button"

export function ClaimButton({ threadId }: { threadId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await claimThread(threadId)
        })
      }
    >
      {isPending ? "Claiming..." : "Claim"}
    </Button>
  )
}
