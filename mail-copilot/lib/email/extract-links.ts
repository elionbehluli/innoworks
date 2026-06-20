const HTTPS_URL_REGEX = /https:\/\/[^\s<>"')\]]+/g

export function extractHttpsLinks(text: string): string[] {
  const matches = text.match(HTTPS_URL_REGEX) ?? []
  return [...new Set(matches)]
}

export function splitTextByHttpsLinks(
  text: string
): Array<{ type: "text" | "url"; value: string }> {
  const segments: Array<{ type: "text" | "url"; value: string }> = []
  let lastIndex = 0

  for (const match of text.matchAll(HTTPS_URL_REGEX)) {
    const index = match.index ?? 0

    if (index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, index) })
    }

    segments.push({ type: "url", value: match[0] })
    lastIndex = index + match[0].length
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) })
  }

  return segments
}
