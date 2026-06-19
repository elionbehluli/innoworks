/// <reference types="deno" />

export async function getOptionalMessageId(req: Request): Promise<string | null> {
  const url = new URL(req.url)
  const fromQuery =
    url.searchParams.get("message_id")?.trim() ||
    url.searchParams.get("message-id")?.trim()

  if (fromQuery) {
    return fromQuery
  }

  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
    const contentType = req.headers.get("content-type") ?? ""
    if (!contentType.includes("application/json")) {
      return null
    }

    try {
      const body = await req.json()
      if (typeof body?.message_id === "string" && body.message_id.trim()) {
        return body.message_id.trim()
      }
      if (typeof body?.["message-id"] === "string" && body["message-id"].trim()) {
        return body["message-id"].trim()
      }
    } catch {
      return null
    }
  }

  return null
}
