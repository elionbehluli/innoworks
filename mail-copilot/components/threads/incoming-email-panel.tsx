"use client"

import { Mail } from "lucide-react"

import { extractHttpsLinks } from "@/lib/email/extract-links"
import { getInitials, parseSender } from "@/lib/email/parse-sender"

import { EmailLinkBadge } from "./email-link-badge"
import { FormattedEmailContent } from "./formatted-email-content"

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date))
}

export function IncomingEmailPanel({
  sender,
  content,
  receivedAt,
  emptyMessage,
}: {
  sender: string
  content: string | null | undefined
  receivedAt: string
  emptyMessage: string
}) {
  const trimmedContent = content?.trim()
  const { name, email } = parseSender(sender)
  const initials = getInitials(name, email)
  const links = trimmedContent ? extractHttpsLinks(trimmedContent) : []

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
              <span>{formatDate(receivedAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4">
          {trimmedContent ? (
            <div className="space-y-4">
              {links.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {links.map((url) => (
                    <EmailLinkBadge key={url} url={url} />
                  ))}
                </div>
              )}

              <FormattedEmailContent content={trimmedContent} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          )}
        </div>
      </div>
    </section>
  )
}
