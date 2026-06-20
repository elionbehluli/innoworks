const META_TAG_REGEX =
  /<meta\s+(?:[^>]*?\s)?(?:property|name)=["']([^"']+)["'][^>]*?\scontent=["']([^"']*)["'][^>]*>|<meta\s+(?:[^>]*?\s)?content=["']([^"']*)["'][^>]*?\s(?:property|name)=["']([^"']+)["'][^>]*>/gi

function extractMetaTags(html: string) {
  const tags = new Map<string, string>()

  for (const match of html.matchAll(META_TAG_REGEX)) {
    const key = (match[1] ?? match[4])?.toLowerCase()
    const value = match[2] ?? match[3]
    if (key && value && !tags.has(key)) {
      tags.set(key, value)
    }
  }

  return tags
}

function pickMeta(tags: Map<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = tags.get(key)
    if (value?.trim()) return value.trim()
  }
  return null
}

export async function GET(request: Request) {
  const urlParam = new URL(request.url).searchParams.get("url")

  if (!urlParam?.startsWith("https://")) {
    return Response.json({ error: "Invalid URL" }, { status: 400 })
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(urlParam)
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 })
  }

  const hostname = parsedUrl.hostname
  const fallback = {
    url: urlParam,
    hostname,
    title: null as string | null,
    description: null as string | null,
    image: null as string | null,
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4000)

  try {
    const response = await fetch(urlParam, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MailCopilot/1.0; +https://mail-copilot.local)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    })

    if (!response.ok) {
      return Response.json(fallback)
    }

    const html = (await response.text()).slice(0, 120_000)
    const tags = extractMetaTags(html)

    const title =
      pickMeta(tags, ["og:title", "twitter:title"]) ??
      html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ??
      null

    const description = pickMeta(tags, [
      "og:description",
      "twitter:description",
      "description",
    ])

    let image = pickMeta(tags, ["og:image", "twitter:image"])
    if (image && !image.startsWith("http")) {
      try {
        image = new URL(image, parsedUrl.origin).href
      } catch {
        image = null
      }
    }

    return Response.json({
      url: urlParam,
      hostname,
      title,
      description,
      image,
    })
  } catch {
    return Response.json(fallback)
  } finally {
    clearTimeout(timeout)
  }
}
