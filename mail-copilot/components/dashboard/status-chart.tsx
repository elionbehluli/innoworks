"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  SKIPPED: "Skipped",
}

const chartConfig = {
  PENDING: { label: "Pending", color: "var(--chart-4)" },
  IN_PROGRESS: { label: "In progress", color: "var(--chart-2)" },
  RESOLVED: { label: "Resolved", color: "var(--chart-1)" },
  SKIPPED: { label: "Skipped", color: "var(--chart-5)" },
} satisfies ChartConfig

export function StatusChart({
  data,
}: {
  data: { status: string; count: number }[]
}) {
  const chartData = data.map((item) => ({
    ...item,
    label: statusLabels[item.status] ?? item.status,
    fill: `var(--color-${item.status})`,
  }))

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          allowDecimals={false}
          width={32}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          content={<ChartTooltipContent hideLabel nameKey="status" />}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ChartContainer>
  )
}
