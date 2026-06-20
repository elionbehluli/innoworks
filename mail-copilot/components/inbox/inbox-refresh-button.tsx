"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Loader2, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function InboxRefreshButton({ className }: { className?: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleRefresh() {
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isPending}
      className={cn(className)}
    >
      {isPending ? (
        <>
          <Loader2 className="animate-spin" />
          Refreshing…
        </>
      ) : (
        <>
          <RefreshCw className="size-3.5" />
          Refresh
        </>
      )}
    </Button>
  )
}
