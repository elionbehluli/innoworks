export type PromptTemplateVars = {
  senderName: string
  subject: string
  body: string
  threadContext: string
}

export function interpolatePromptTemplate(
  template: string,
  vars: PromptTemplateVars
): string {
  return template
    .replaceAll("{{senderName}}", vars.senderName)
    .replaceAll("{{subject}}", vars.subject)
    .replaceAll("{{body}}", vars.body)
    .replaceAll("{{threadContext}}", vars.threadContext)
}

export function parseSenderName(raw: string): string {
  const trimmed = raw.trim()
  const match = trimmed.match(/^(.+?)\s*<([^>]+)>$/)

  if (match) {
    const name = match[1].replace(/^["']|["']$/g, "").trim()
    if (name) return name
    return match[2].trim()
  }

  if (trimmed.includes("@")) {
    return trimmed.split("@")[0] ?? trimmed
  }

  return trimmed || "klant"
}
