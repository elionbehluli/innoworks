import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { CategoryChart } from "@/components/dashboard/category-chart"
import { StatusChart } from "@/components/dashboard/status-chart"
import { ThreadVolumeChart } from "@/components/dashboard/thread-volume-chart"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getDashboardStats } from "@/lib/dashboard/stats"
import { getProfile } from "@/lib/utils/supabase/auth"
import { cn } from "@/lib/utils"

function formatToday() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date())
}

const statusOrder = ["PENDING", "IN_PROGRESS", "RESOLVED", "SKIPPED"] as const

export default async function HomePage() {
  const [profile, stats] = await Promise.all([getProfile(), getDashboardStats()])

  const totalThreads = statusOrder.reduce(
    (sum, status) => sum + stats.statusCounts[status],
    0
  )
  const openThreads =
    stats.statusCounts.PENDING + stats.statusCounts.IN_PROGRESS
  const resolutionRate =
    totalThreads > 0
      ? Math.round((stats.statusCounts.RESOLVED / totalThreads) * 100)
      : 0

  const statusChartData = statusOrder.map((status) => ({
    status,
    count: stats.statusCounts[status],
  }))

  const metrics = [
    {
      label: "Ready for review",
      value: stats.readyForReview,
      hint: "Drafted and categorized",
      href: "/threads",
    },
    {
      label: "Awaiting claim",
      value: stats.unassignedPending,
      hint: "Unassigned pending",
      href: "/threads",
    },
    {
      label: "Resolved this week",
      value: stats.resolvedLast7Days,
      hint: "Last 7 days",
    },
    {
      label: "Resolution rate",
      value: `${resolutionRate}%`,
      hint: `${stats.statusCounts.RESOLVED} of ${totalThreads} threads`,
    },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">{formatToday()}</p>
        <h1 className="text-2xl font-medium tracking-tight">
          {profile?.display_name
            ? `Welcome back, ${profile.display_name}`
            : "Dashboard"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {openThreads} open thread{openThreads === 1 ? "" : "s"} across{" "}
          {stats.activeCategories} active categor
          {stats.activeCategories === 1 ? "y" : "ies"}.
        </p>
      </header>

      <section className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const inner = (
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="mt-2 text-3xl font-medium tabular-nums tracking-tight">
                  {metric.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p>
              </div>
              {metric.href ? (
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              ) : null}
            </div>
          )

          if (metric.href) {
            return (
              <Link
                key={metric.label}
                href={metric.href}
                className="group bg-card p-5 transition-colors hover:bg-muted/30"
              >
                {inner}
              </Link>
            )
          }

          return (
            <div key={metric.label} className="bg-card p-5">
              {inner}
            </div>
          )
        })}
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className={cn("lg:col-span-3")}>
          <CardHeader>
            <CardTitle>Inbound volume</CardTitle>
            <CardDescription>
              New threads received over the last 14 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThreadVolumeChart data={stats.volumeByDay} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Queue status</CardTitle>
            <CardDescription>Current thread distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusChart data={statusChartData} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By category</CardTitle>
          <CardDescription>
            Thread volume across active routing categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryChart data={stats.byCategory} />
        </CardContent>
      </Card>
    </div>
  )
}
