"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { LogoutButton } from "@/components/auth/logout-button"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Home" },
  { href: "/threads", label: "Threads" },
  { href: "/categories", label: "Categories" },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <div className="flex min-h-svh flex-col">
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={
              (item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href))
                ? "page"
                : undefined
            }
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto border-t border-sidebar-border p-4">
        <LogoutButton className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground" />
      </div>
    </div>
  )
}
