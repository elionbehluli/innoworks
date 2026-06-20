import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"

import { PAGE_SIZE, SentPagination } from "@/components/sent/sent-pagination"
import { InboxRefreshButton } from "@/components/inbox/inbox-refresh-button"
import { getSupabase } from "@/lib/utils/supabase/auth"
import { cn } from "@/lib/utils"

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date))
}

function ReadStatus({
  openedAt,
  openCount,
}: {
  openedAt: string | null
  openCount: number
}) {
  if (openedAt) {
    return (
      <div className="space-y-1">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
            "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          )}
        >
          <Eye className="size-3" />
          Read
        </span>
        <p className="text-xs text-muted-foreground">
          {formatDate(openedAt)}
          {openCount > 1 ? ` · ${openCount} opens` : null}
        </p>
      </div>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        "bg-muted text-muted-foreground"
      )}
    >
      <EyeOff className="size-3" />
      Not opened yet
    </span>
  )
}

export default async function SentPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await getSupabase()

  const { data: threads, count } = await supabase
    .from("threads")
    .select(
      "id, subject, sender, sent_at, opened_at, open_count, updated_at",
      { count: "exact" }
    )
    .eq("status", "RESOLVED")
    .order("sent_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .range(from, to)

  const totalCount = count ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-medium">Sent</h1>
          <p className="text-sm text-muted-foreground">
            Replies you have sent. Read status updates when the recipient opens
            the email.
          </p>
        </div>
        <InboxRefreshButton />
      </div>

      {threads && threads.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Subject</th>
                  <th className="px-4 py-3 text-left font-medium">To</th>
                  <th className="px-4 py-3 text-left font-medium">Sent</th>
                  <th className="px-4 py-3 text-left font-medium">Read status</th>
                  <th className="px-4 py-3 text-right" />
                </tr>
              </thead>
              <tbody>
                {threads.map((thread) => (
                  <tr
                    key={thread.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/threads/${thread.id}`}
                        className="font-medium hover:underline"
                      >
                        {thread.subject}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {thread.sender}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDate(thread.sent_at ?? thread.updated_at)}
                    </td>
                    <td className="px-4 py-3">
                      <ReadStatus
                        openedAt={thread.opened_at}
                        openCount={thread.open_count}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/threads/${thread.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SentPagination page={page} totalCount={totalCount} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {totalCount > 0 && page > 1
            ? "No sent emails on this page."
            : "No sent emails yet."}
        </p>
      )}
    </div>
  )
}
