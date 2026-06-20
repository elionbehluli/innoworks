import { getSupabase } from "@/lib/utils/supabase/auth"

const STATUSES = ["PENDING", "IN_PROGRESS", "RESOLVED", "SKIPPED"] as const

export type DashboardStats = {
  statusCounts: Record<(typeof STATUSES)[number], number>
  readyForReview: number
  unassignedPending: number
  activeCategories: number
  resolvedLast7Days: number
  volumeByDay: { date: string; count: number }[]
  byCategory: { name: string; count: number }[]
}

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function buildDayRange(days: number) {
  const end = startOfDay(new Date())
  const range: string[] = []

  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(end)
    day.setDate(end.getDate() - i)
    range.push(formatDayKey(day))
  }

  return range
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await getSupabase()

  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13)
  fourteenDaysAgo.setHours(0, 0, 0, 0)

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const [
    statusResults,
    readyResult,
    unassignedResult,
    categoriesResult,
    resolvedWeekResult,
    recentThreads,
    categoryThreads,
  ] = await Promise.all([
    Promise.all(
      STATUSES.map(async (status) => {
        const { count } = await supabase
          .from("threads")
          .select("*", { count: "exact", head: true })
          .eq("status", status)
        return { status, count: count ?? 0 }
      })
    ),
    supabase
      .from("threads")
      .select("*", { count: "exact", head: true })
      .not("category_id", "is", null)
      .not("ai_draft_reply", "is", null)
      .in("status", ["PENDING", "IN_PROGRESS"]),
    supabase
      .from("threads")
      .select("*", { count: "exact", head: true })
      .eq("status", "PENDING")
      .is("assigned_to", null),
    supabase
      .from("categories")
      .select("*", { count: "exact", head: true })
      .eq("status_id", 1),
    supabase
      .from("threads")
      .select("*", { count: "exact", head: true })
      .eq("status", "RESOLVED")
      .gte("updated_at", sevenDaysAgo.toISOString()),
    supabase
      .from("threads")
      .select("created_at")
      .gte("created_at", fourteenDaysAgo.toISOString()),
    supabase
      .from("threads")
      .select("categories(name)")
      .not("category_id", "is", null),
  ])

  const statusCounts = Object.fromEntries(
    statusResults.map(({ status, count }) => [status, count])
  ) as Record<(typeof STATUSES)[number], number>

  const dayRange = buildDayRange(14)
  const countsByDay = Object.fromEntries(dayRange.map((day) => [day, 0]))

  for (const thread of recentThreads.data ?? []) {
    const key = formatDayKey(new Date(thread.created_at))
    if (key in countsByDay) {
      countsByDay[key] += 1
    }
  }

  const volumeByDay = dayRange.map((date) => ({
    date,
    count: countsByDay[date],
  }))

  const categoryMap = new Map<string, number>()
  for (const row of categoryThreads.data ?? []) {
    const raw = row.categories as { name: string } | { name: string }[] | null
    const name = Array.isArray(raw) ? raw[0]?.name : raw?.name
    if (!name) continue
    categoryMap.set(name, (categoryMap.get(name) ?? 0) + 1)
  }

  const byCategory = [...categoryMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  return {
    statusCounts,
    readyForReview: readyResult.count ?? 0,
    unassignedPending: unassignedResult.count ?? 0,
    activeCategories: categoriesResult.count ?? 0,
    resolvedLast7Days: resolvedWeekResult.count ?? 0,
    volumeByDay,
    byCategory,
  }
}
