"use client"

import type { ReactNode } from "react"

import { splitTextByHttpsLinks } from "@/lib/email/extract-links"

import { EmailLinkBadge } from "./email-link-badge"

const INLINE_FORMAT_REGEX = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g

function renderInlineFormatting(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let matchIndex = 0

  for (const match of text.matchAll(INLINE_FORMAT_REGEX)) {
    const index = match.index ?? 0
    const token = match[0]

    if (index > lastIndex) {
      nodes.push(
        <span key={`${keyPrefix}-text-${matchIndex}`}>
          {text.slice(lastIndex, index)}
        </span>
      )
      matchIndex += 1
    }

    if (token.startsWith("**")) {
      nodes.push(
        <strong key={`${keyPrefix}-strong-${matchIndex}`} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith("*")) {
      nodes.push(
        <em key={`${keyPrefix}-em-${matchIndex}`} className="italic">
          {token.slice(1, -1)}
        </em>
      )
    } else {
      nodes.push(
        <code
          key={`${keyPrefix}-code-${matchIndex}`}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
        >
          {token.slice(1, -1)}
        </code>
      )
    }

    matchIndex += 1
    lastIndex = index + token.length
  }

  if (lastIndex < text.length) {
    nodes.push(
      <span key={`${keyPrefix}-text-${matchIndex}`}>{text.slice(lastIndex)}</span>
    )
  }

  return nodes
}

function renderInlineContent(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []

  for (const [index, segment] of splitTextByHttpsLinks(text).entries()) {
    const segmentKey = `${keyPrefix}-${index}`

    if (segment.type === "url") {
      nodes.push(<EmailLinkBadge key={segmentKey} url={segment.value} />)
      continue
    }

    nodes.push(...renderInlineFormatting(segment.value, segmentKey))
  }

  return nodes
}

function renderParagraph(text: string, key: string) {
  return (
    <p key={key} className="leading-relaxed text-foreground">
      {renderInlineContent(text, key)}
    </p>
  )
}

export function FormattedEmailContent({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n")
  const blocks: ReactNode[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]

    if (!line.trim()) {
      index += 1
      continue
    }

    if (/^[-*•]\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^[-*•]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^[-*•]\s+/, ""))
        index += 1
      }

      blocks.push(
        <ul
          key={`list-${index}`}
          className="list-disc space-y-1 pl-5 leading-relaxed text-foreground"
        >
          {items.map((item, itemIndex) => (
            <li key={`list-${index}-${itemIndex}`}>
              {renderInlineContent(item, `list-${index}-${itemIndex}`)}
            </li>
          ))}
        </ul>
      )
      continue
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s+/, ""))
        index += 1
      }

      blocks.push(
        <ol
          key={`olist-${index}`}
          className="list-decimal space-y-1 pl-5 leading-relaxed text-foreground"
        >
          {items.map((item, itemIndex) => (
            <li key={`olist-${index}-${itemIndex}`}>
              {renderInlineContent(item, `olist-${index}-${itemIndex}`)}
            </li>
          ))}
        </ol>
      )
      continue
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = []
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ""))
        index += 1
      }

      blocks.push(
        <blockquote
          key={`quote-${index}`}
          className="border-l-2 border-primary/30 pl-4 text-muted-foreground"
        >
          {quoteLines.map((quoteLine, quoteIndex) =>
            renderParagraph(quoteLine, `quote-${index}-${quoteIndex}`)
          )}
        </blockquote>
      )
      continue
    }

    if (/^#{1,3}\s+/.test(line)) {
      const level = line.match(/^#+/)?.[0].length ?? 1
      const headingText = line.replace(/^#{1,3}\s+/, "")
      const headingClass =
        level === 1
          ? "text-lg font-semibold"
          : level === 2
            ? "text-base font-semibold"
            : "text-sm font-semibold"

      blocks.push(
        <p key={`heading-${index}`} className={`${headingClass} text-foreground`}>
          {renderInlineContent(headingText, `heading-${index}`)}
        </p>
      )
      index += 1
      continue
    }

    const paragraphLines: string[] = [line]
    index += 1

    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^[-*•]\s+/.test(lines[index]) &&
      !/^\d+\.\s+/.test(lines[index]) &&
      !/^>\s?/.test(lines[index]) &&
      !/^#{1,3}\s+/.test(lines[index])
    ) {
      paragraphLines.push(lines[index])
      index += 1
    }

    blocks.push(renderParagraph(paragraphLines.join("\n"), `p-${index}`))
  }

  return <div className="space-y-3 text-sm">{blocks}</div>
}
