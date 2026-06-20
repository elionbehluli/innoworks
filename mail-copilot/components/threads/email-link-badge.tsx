"use client"

import { useEffect, useState } from "react"
import { ExternalLink, Link2 } from "lucide-react"

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"

type LinkPreview = {
  url: string
  hostname: string
  title: string | null
  description: string | null
  image: string | null
}

function truncateUrl(url: string, max = 56) {
  if (url.length <= max) return url
  return `${url.slice(0, max - 1)}…`
}

function LinkPreviewCard({ url }: { url: string }) {
  const [preview, setPreview] = useState<LinkPreview>(() => {
    try {
      return {
        url,
        hostname: new URL(url).hostname,
        title: null,
        description: null,
        image: null,
      }
    } catch {
      return {
        url,
        hostname: url,
        title: null,
        description: null,
        image: null,
      }
    }
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadPreview() {
      try {
        const response = await fetch(
          `/api/link-preview?url=${encodeURIComponent(url)}`
        )
        if (!response.ok || cancelled) return

        const data = (await response.json()) as LinkPreview
        if (!cancelled) {
          setPreview(data)
        }
      } catch {
        // Keep hostname-only fallback.
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadPreview()

    return () => {
      cancelled = true
    }
  }, [url])

  return (
    <div className="space-y-2">
      {preview.image && (
        <div className="overflow-hidden rounded-md border border-border bg-muted/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.image}
            alt=""
            className="h-28 w-full object-cover"
          />
        </div>
      )}

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">
          {preview.hostname}
        </p>
        {isLoading && !preview.title ? (
          <p className="text-sm text-muted-foreground">Loading preview…</p>
        ) : (
          <>
            {preview.title && (
              <p className="line-clamp-2 text-sm font-medium leading-snug">
                {preview.title}
              </p>
            )}
            {preview.description && (
              <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                {preview.description}
              </p>
            )}
          </>
        )}
        <p className="break-all text-xs text-muted-foreground">
          {truncateUrl(preview.url)}
        </p>
      </div>

      <p className="flex items-center gap-1 text-xs text-primary">
        <ExternalLink className="size-3" />
        Open link
      </p>
    </div>
  )
}

export function EmailLinkBadge({
  url,
  className,
}: {
  url: string
  className?: string
}) {
  let hostname = url
  try {
    hostname = new URL(url).hostname
  } catch {
    // Keep raw URL as label fallback.
  }

  return (
    <HoverCard openDelay={200} closeDelay={80}>
      <HoverCardTrigger asChild>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "mx-0.5 inline-flex max-w-full items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 align-middle text-xs font-medium text-primary transition-colors hover:bg-primary/15",
            className
          )}
        >
          <Link2 className="size-3 shrink-0" />
          <span className="truncate">link</span>
          <span className="hidden truncate text-primary/70 sm:inline">
            · {hostname}
          </span>
        </a>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-80">
        <LinkPreviewCard url={url} />
      </HoverCardContent>
    </HoverCard>
  )
}
