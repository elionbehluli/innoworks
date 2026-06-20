"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Loader2, RefreshCw } from "lucide-react"

import { refreshInbox } from "@/app/(dashboard)/inbox/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function InboxRefreshButton({ className }: { className?: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  function handleRefresh() {
    setFeedback(null)
    startTransition(async () => {
      const result = await refreshInbox()
      if (result.error) {
        setFeedback({ type: "error", message: result.error })
        return
      }

      setFeedback({
        type: "success",
        message: result.summary ?? "Inbox refreshed.",
      })
      router.refresh()
    })
  }

  return (
    <div className={cn("flex flex-wrap items-center justify-end gap-3", className)}>
      {feedback && (
        <p
          role="status"
          className={cn(
            "text-xs",
            feedback.type === "error"
              ? "text-destructive"
              : "text-muted-foreground"
          )}
        >
          {feedback.message}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="animate-spin" />
            Syncing inbox…
          </>
        ) : (
          <>
            <RefreshCw className="size-3.5" />
            Refresh inbox
          </>
        )}
      </Button>
    </div>
  )
}
