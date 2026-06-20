import Link from "next/link"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"

import { IncomingEmailPanel } from "@/components/threads/incoming-email-panel"
import { ThreadDraftEditor } from "@/components/threads/thread-draft-editor"
import { createClient } from "@/lib/utils/supabase/server"
import { cn } from "@/lib/utils"

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  IN_PROGRESS: "bg-primary/15 text-primary",
  RESOLVED: "bg-muted text-muted-foreground",
  SKIPPED: "bg-muted text-muted-foreground",
}

function getCategoryName(
  categories: { name: string } | { name: string }[] | null | undefined
) {
  if (!categories) return "Uncategorized"
  if (Array.isArray(categories)) return categories[0]?.name ?? "Uncategorized"
  return categories.name
}

function getAssigneeName(
  profiles: { display_name: string | null } | { display_name: string | null }[] | null | undefined
) {
  if (!profiles) return null
  if (Array.isArray(profiles)) return profiles[0]?.display_name ?? null
  return profiles.display_name
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date))
}

export default async function ThreadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: thread } = await supabase
    .from("threads")
    .select(
      "id, subject, sender, snippet, body_text, ai_draft_reply, ai_draft_subject, ai_reasoning, status, created_at, updated_at, categories(name), profiles!threads_assigned_to_fkey(display_name)"
    )
    .eq("id", id)
    .single()

  if (!thread) {
    notFound()
  }

  const incomingEmail =
    thread.body_text?.trim() || thread.snippet?.trim() || null
  const assigneeName = getAssigneeName(
    thread.profiles as
      | { display_name: string | null }
      | { display_name: string | null }[]
      | null
  )
  const isActionable =
    thread.status === "PENDING" || thread.status === "IN_PROGRESS"

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/threads"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to threads
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-medium">{thread.subject}</h1>
          <span
            className={cn(
              "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
              statusStyles[thread.status] ?? statusStyles.RESOLVED
            )}
          >
            {thread.status.replace("_", " ")}
          </span>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Category</dt>
            <dd className="font-medium">
              {getCategoryName(
                thread.categories as
                  | { name: string }
                  | { name: string }[]
                  | null
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Assigned to</dt>
            <dd className="font-medium">{assigneeName ?? "Unassigned"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Received</dt>
            <dd className="font-medium">{formatDate(thread.created_at)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Last updated</dt>
            <dd className="font-medium">{formatDate(thread.updated_at)}</dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <IncomingEmailPanel
          sender={thread.sender}
          content={incomingEmail}
          receivedAt={thread.created_at}
          emptyMessage="No email content available for this thread."
        />
        <ThreadDraftEditor
          threadId={thread.id}
          initialSubject={
            thread.ai_draft_subject?.trim() ||
            (thread.subject ? `Re: ${thread.subject.replace(/^re:\s*/i, "")}` : "")
          }
          initialDraft={thread.ai_draft_reply ?? ""}
          reasoning={thread.ai_reasoning}
          isActionable={isActionable}
        />
      </div>
    </div>
  )
}
