"use client"

import { DotPattern } from "@/components/ui/dot-pattern"
import { cn } from "@/lib/utils"

type DotBackgroundProps = {
  variant?: "dashboard" | "auth"
  className?: string
}

export function DotBackground({
  variant = "dashboard",
  className,
}: DotBackgroundProps) {
  const isAuth = variant === "auth"

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 h-full w-full overflow-hidden",
        className
      )}
    >
      <DotPattern
        width={20}
        height={20}
        cx={1}
        cy={1}
        cr={1}
        glow={isAuth}
        className={cn(
          isAuth
            ? "text-primary/20 dark:text-primary/25 [mask-image:radial-gradient(520px_circle_at_center,white,transparent)]"
            : "text-neutral-400/30 dark:text-neutral-500/25"
        )}
      />
    </div>
  )
}
