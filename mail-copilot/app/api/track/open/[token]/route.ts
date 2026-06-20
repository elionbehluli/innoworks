import { createAdminClient } from "@/lib/utils/supabase/admin"

const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
)

function parseTrackingToken(raw: string): string | null {
  const token = raw.replace(/\.gif$/i, "").trim()
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  return uuidRegex.test(token) ? token : null
}

function parseSentAtParam(value: string | null): string | null {
  if (!value?.trim()) return null
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return null
  return new Date(parsed).toISOString()
}

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token: rawToken } = await context.params
  const token = parseTrackingToken(rawToken)
  const sentAt = parseSentAtParam(
    new URL(request.url).searchParams.get("sent")
  )

  if (token) {
    const supabase = createAdminClient()
    await supabase.rpc("record_email_open", {
      p_token: token,
      p_sent_at: sentAt,
    })
  }

  return new Response(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  })
}
