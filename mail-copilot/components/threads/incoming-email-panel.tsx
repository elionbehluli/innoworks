"use client"

import { Mail } from "lucide-react"

import { getInitials, parseSender } from "@/lib/email/parse-sender"

import { FormattedEmailContent } from "./formatted-email-content"

export function IncomingEmailPanel({
  sender,
  content,
  receivedAtLabel,
  emptyMessage,
}: {
  sender: string
  content: string | null | undefined
  receivedAtLabel: string
  emptyMessage: string
}) {
  const trimmedContent = content?.trim()
  const { name, email } = parseSender(sender)
  const initials = getInitials(name, email)

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-border">
      <div className="border-b border-border bg-muted/50 px-4 py-3">
        <h2 className="text-sm font-medium">Incoming email</h2>
      </div>

      <div className="flex min-h-48 flex-1 flex-col">
        <div className="flex items-start gap-3 border-b border-border bg-muted/20 px-4 py-4">
          <div
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
          >
            {initials}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-medium text-foreground">
              {name ?? email.split("@")[0]}
            </p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Mail className="size-3 shrink-0" />
                {email}
              </span>
              <span>{receivedAtLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4">
          {trimmedContent ? (
            <FormattedEmailContent content={trimmedContent} />
          ) : (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          )}
        </div>
      </div>
    </section>
  )
}
