/// <reference types="deno" />

export async function getOptionalThreadId(req: Request): Promise<string | null> {
  const url = new URL(req.url)
  const fromQuery =
    url.searchParams.get("thread_id")?.trim() ||
    url.searchParams.get("thread-id")?.trim()

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
      if (typeof body?.thread_id === "string" && body.thread_id.trim()) {
        return body.thread_id.trim()
      }
      if (typeof body?.["thread-id"] === "string" && body["thread-id"].trim()) {
        return body["thread-id"].trim()
      }
    } catch {
      return null
    }
  }

  return null
}
