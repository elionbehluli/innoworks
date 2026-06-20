export function parseSender(raw: string): { name: string | null; email: string } {
  const trimmed = raw.trim()
  const match = trimmed.match(/^(.+?)\s*<([^>]+)>$/)

  if (match) {
    const name = match[1].replace(/^["']|["']$/g, "").trim()
    return { name: name || null, email: match[2].trim() }
  }

  if (trimmed.includes("@")) {
    return { name: null, email: trimmed }
  }

  return { name: trimmed, email: trimmed }
}

export function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const local = email.split("@")[0] ?? email
  return local.slice(0, 2).toUpperCase()
}
