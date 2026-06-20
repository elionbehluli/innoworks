import { DotBackground } from "@/components/layout/dot-background"
import { SidebarNav } from "@/components/layout/sidebar-nav"

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-svh">
      <aside className="relative z-10 w-56 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <SidebarNav />
      </aside>
      <main className="relative isolate min-h-svh flex-1 overflow-hidden bg-background">
        <DotBackground variant="dashboard" className="z-0" />
        <div className="relative z-10 min-h-svh p-6">{children}</div>
      </main>
    </div>
  )
}
