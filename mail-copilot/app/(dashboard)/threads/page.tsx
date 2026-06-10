import { cookies } from "next/headers"

import { ClaimButton } from "@/components/threads/claim-button"
import { createClient } from "@/lib/utils/supabase/server"
import { cn } from "@/lib/utils"

function getCategoryName(
  categories: { name: string } | { name: string }[] | null | undefined
) {
  if (!categories) return "—"
  if (Array.isArray(categories)) return categories[0]?.name ?? "—"
  return categories.name
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date))
}

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  IN_PROGRESS: "bg-primary/15 text-primary",
  RESOLVED: "bg-muted text-muted-foreground",
}

export default async function ThreadsPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: threads } = await supabase
    .from("threads")
    .select(
      "id, subject, sender, snippet, status, assigned_to, created_at, categories(name)"
    )
    .order("status")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-medium">Threads</h1>

      {threads && threads.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Subject</th>
                <th className="px-4 py-3 text-left font-medium">Sender</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
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
                    <p className="font-medium">{thread.subject}</p>
                    {thread.snippet && (
                      <p className="mt-0.5 line-clamp-1 text-muted-foreground">
                        {thread.snippet}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {thread.sender}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {getCategoryName(
                      thread.categories as
                        | { name: string }
                        | { name: string }[]
                        | null
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                        statusStyles[thread.status] ?? statusStyles.RESOLVED
                      )}
                    >
                      {thread.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {formatDate(thread.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {thread.status === "PENDING" && !thread.assigned_to && (
                      <ClaimButton threadId={thread.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No threads yet.</p>
      )}
    </div>
  )
}
