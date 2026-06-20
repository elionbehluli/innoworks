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
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      <DotPattern
        width={20}
        height={20}
        cx={1}
        cy={1}
        cr={1.25}
        glow={isAuth}
        className={cn(
          isAuth
            ? "text-primary/45 dark:text-primary/55 [mask-image:radial-gradient(480px_circle_at_center,white,transparent)]"
            : "text-neutral-400/90 dark:text-neutral-500/70 [mask-image:radial-gradient(ellipse_at_top,white,transparent_70%)]"
        )}
      />
      {!isAuth && (
        <DotPattern
          width={20}
          height={20}
          cx={1}
          cy={1}
          cr={1.25}
          className="text-primary/20 dark:text-primary/30 [mask-image:radial-gradient(420px_circle_at_100%_0%,white,transparent)]"
        />
      )}
    </div>
  )
}
