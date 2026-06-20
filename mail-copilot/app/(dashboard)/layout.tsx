import { DotBackground } from "@/components/layout/dot-background"
import { SidebarNav } from "@/components/layout/sidebar-nav"

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="relative flex min-h-svh">
      <DotBackground variant="dashboard" className="-z-10" />
      <aside className="relative z-10 w-56 shrink-0 border-r border-sidebar-border bg-sidebar/95 text-sidebar-foreground backdrop-blur-sm">
        <SidebarNav />
      </aside>
      <main className="relative z-10 min-h-svh flex-1 p-6">{children}</main>
    </div>
  )
}
