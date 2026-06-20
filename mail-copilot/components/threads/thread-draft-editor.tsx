"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"

import {
  approveAndSendThread,
  skipThread,
} from "@/app/(dashboard)/threads/actions"
import { Button } from "@/components/ui/button"
import {
  FormField,
  FormRootError,
  formFieldClassName,
} from "@/components/ui/form-field"
import {
  draftReplySchema,
  type DraftReplyInput,
} from "@/lib/validations/thread"

export function ThreadDraftEditor({
  threadId,
  initialDraft,
  isActionable,
}: {
  threadId: string
  initialDraft: string
  isActionable: boolean
}) {
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [isApproving, startApprove] = useTransition()
  const [isSkipping, startSkip] = useTransition()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DraftReplyInput>({
    resolver: zodResolver(draftReplySchema),
    defaultValues: { draft: initialDraft },
  })

  const isBusy = isApproving || isSkipping

  const onApprove = handleSubmit((data) => {
    setFeedback(null)
    startApprove(async () => {
      const result = await approveAndSendThread(threadId, data.draft)
      if (result?.error) {
        setFeedback({ type: "error", message: result.error })
      }
    })
  })

  function handleSkip() {
    const confirmed = window.confirm(
      "Are you sure you want to discard this draft? You will need to reply manually."
    )
    if (!confirmed) return

    setFeedback(null)
    startSkip(async () => {
      const result = await skipThread(threadId)
      if (result?.error) {
        setFeedback({ type: "error", message: result.error })
      }
    })
  }

  const draftValue = initialDraft

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-border">
      <div className="border-b border-border bg-muted/50 px-4 py-3">
        <h2 className="text-sm font-medium">AI draft reply</h2>
        {isActionable && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Review and edit the draft before sending.
          </p>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        {isActionable ? (
          <FormField
            id="draft-reply"
            label="Draft reply"
            error={errors.draft?.message}
            className="flex-1"
          >
            <textarea
              id="draft-reply"
              rows={14}
              className={`${formFieldClassName} min-h-64 resize-y leading-relaxed`}
              placeholder="No AI draft has been generated yet."
              disabled={isBusy}
              aria-invalid={Boolean(errors.draft)}
              {...register("draft")}
            />
          </FormField>
        ) : (
          <div className="min-h-48">
            {draftValue.trim() ? (
              <pre className="font-sans text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {draftValue}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground">
                No AI draft has been generated yet.
              </p>
            )}
          </div>
        )}

        <FormRootError message={errors.root?.message} />

        {feedback && (
          <div
            role="alert"
            className={
              feedback.type === "error"
                ? "rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                : "rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary"
            }
          >
            {feedback.message}
          </div>
        )}

        {isActionable && (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={onApprove}
              disabled={isBusy}
              className="min-w-36"
            >
              {isApproving ? (
                <>
                  <Loader2 className="animate-spin" />
                  Sending...
                </>
              ) : (
                "Approve & Send"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSkip}
              disabled={isBusy}
              className="min-w-36"
            >
              {isSkipping ? (
                <>
                  <Loader2 className="animate-spin" />
                  Discarding...
                </>
              ) : (
                "Skip / Discard"
              )}
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
