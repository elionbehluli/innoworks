import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database, Json } from "@/lib/utils/supabase/types"

type AdminClient = SupabaseClient<Database>
type JsonRecord = Record<string, unknown>

function sanitizeHeaders(headers: Headers): JsonRecord {
  const sanitized: JsonRecord = {}
  headers.forEach((value, key) => {
    sanitized[key] =
      key.toLowerCase() === "authorization" ? "[REDACTED]" : value
  })
  return sanitized
}

function parseBodyForStorage(
  body: string | null | undefined
): JsonRecord | null {
  if (!body) return null

  try {
    return JSON.parse(body) as JsonRecord
  } catch {
    return { raw: body }
  }
}

async function readResponseBody(response: Response): Promise<JsonRecord | null> {
  const text = await response.clone().text()
  if (!text) return null

  try {
    return JSON.parse(text) as JsonRecord
  } catch {
    return { raw: text }
  }
}

export async function logGmailRequest(
  supabase: AdminClient,
  options: {
    method: string
    url: string
    requestHeaders: Headers
    requestBody?: string | null
    response: Response
  }
): Promise<void> {
  try {
    const responseBody = await readResponseBody(options.response)

    const { error } = await supabase.from("gmail_requests").insert({
      method: options.method,
      url: options.url,
      request_headers: sanitizeHeaders(options.requestHeaders) as Json,
      request_body: parseBodyForStorage(options.requestBody) as Json,
      response_status: options.response.status,
      response_body: responseBody as Json,
    })

    if (error) {
      console.error("Failed to log Gmail request:", error.message)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("Failed to log Gmail request:", message)
  }
}
