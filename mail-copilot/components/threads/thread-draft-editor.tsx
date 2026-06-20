"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"

import {
  saveDraftReply,
  sendThreadNow,
  skipThread,
} from "@/app/(dashboard)/threads/actions"
import { Button } from "@/components/ui/button"
import {
  FormField,
  FormRootError,
  formFieldClassName,
} from "@/components/ui/form-field"
import {
  draftReviewSchema,
  type DraftReviewInput,
} from "@/lib/validations/thread"

export function ThreadDraftEditor({
  threadId,
  initialSubject,
  initialDraft,
  reasoning,
  isActionable,
}: {
  threadId: string
  initialSubject: string
  initialDraft: string
  reasoning: string | null
  isActionable: boolean
}) {
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [showSendConfirm, setShowSendConfirm] = useState(false)
  const [isSavingDraft, startSaveDraft] = useTransition()
  const [isSending, startSend] = useTransition()
  const [isSkipping, startSkip] = useTransition()

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors, isDirty },
  } = useForm<DraftReviewInput>({
    resolver: zodResolver(draftReviewSchema),
    defaultValues: {
      subject: initialSubject,
      draft: initialDraft,
    },
  })

  const isBusy = isSavingDraft || isSending || isSkipping

  const onSaveDraft = handleSubmit((data) => {
    setFeedback(null)
    startSaveDraft(async () => {
      const result = await saveDraftReply(threadId, data)
      if (result?.error) {
        setFeedback({ type: "error", message: result.error })
        return
      }
      reset(data)
      setFeedback({ type: "success", message: "Draft saved." })
    })
  })

  const onSendNow = handleSubmit((data) => {
    setFeedback(null)
    startSend(async () => {
      const result = await sendThreadNow(threadId, data)
      if (result?.error) {
        setFeedback({ type: "error", message: result.error })
      }
    })
    setShowSendConfirm(false)
  })

  function handleSkip() {
    const confirmed = window.confirm(
      "Skip this email? It will be hidden from the review queue."
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

  function openSendConfirm() {
    setFeedback(null)
    const parsed = draftReviewSchema.safeParse(getValues())
    if (!parsed.success) {
      setFeedback({
        type: "error",
        message: parsed.error.issues[0]?.message ?? "Invalid draft.",
      })
      return
    }
    setShowSendConfirm(true)
  }

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-border">
      <div className="border-b border-border bg-muted/50 px-4 py-3">
        <h2 className="text-sm font-medium">AI draft reply</h2>
        {isActionable && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Edit the draft if needed, save your changes, then send or skip.
          </p>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        {reasoning && (
          <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              AI reasoning
            </p>
            <p className="mt-1 leading-relaxed text-foreground">{reasoning}</p>
          </div>
        )}

        {isActionable ? (
          <>
            <FormField
              id="draft-subject"
              label="Draft subject"
              error={errors.subject?.message}
            >
              <input
                id="draft-subject"
                type="text"
                className={formFieldClassName}
                placeholder={`Re: ${initialSubject || "..."}`}
                disabled={isBusy}
                aria-invalid={Boolean(errors.subject)}
                {...register("subject")}
              />
            </FormField>

            <FormField
              id="draft-reply"
              label="Draft body"
              error={errors.draft?.message}
              className="flex-1"
            >
              <textarea
                id="draft-reply"
                rows={12}
                className={`${formFieldClassName} min-h-56 resize-y leading-relaxed`}
                placeholder="No AI draft has been generated yet."
                disabled={isBusy}
                aria-invalid={Boolean(errors.draft)}
                {...register("draft")}
              />
            </FormField>
          </>
        ) : (
          <div className="min-h-48 space-y-3">
            {initialSubject.trim() && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Subject
                </p>
                <p className="text-sm font-medium">{initialSubject}</p>
              </div>
            )}
            {initialDraft.trim() ? (
              <pre className="font-sans text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {initialDraft}
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
            {isDirty && (
              <Button
                type="button"
                variant="outline"
                onClick={onSaveDraft}
                disabled={isBusy}
                className="min-w-24"
              >
                {isSavingDraft ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={openSendConfirm}
              disabled={isBusy}
              className="min-w-32"
            >
              Send now
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSkip}
              disabled={isBusy}
              className="min-w-28"
            >
              {isSkipping ? (
                <>
                  <Loader2 className="animate-spin" />
                  Skipping…
                </>
              ) : (
                "Skip"
              )}
            </Button>
          </div>
        )}
      </div>

      {showSendConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="send-confirm-title"
            className="w-full max-w-md space-y-4 rounded-xl border border-border bg-background p-6 shadow-lg"
          >
            <div className="space-y-2">
              <h3 id="send-confirm-title" className="text-lg font-medium">
                Send this reply now?
              </h3>
              <p className="text-sm text-muted-foreground">
                The email will be sent immediately via Gmail. This cannot be
                undone from Mail Copilot.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSendConfirm(false)}
                disabled={isSending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={onSendNow}
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Yes, send now"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
