import { SidebarNav } from "@/components/layout/sidebar-nav"

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-svh">
      <aside className="w-56 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <SidebarNav />
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
