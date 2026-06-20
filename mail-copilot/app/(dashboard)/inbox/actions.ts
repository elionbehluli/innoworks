"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/utils/supabase/server"

type StagePayload = {
  status: string
  result?: { processed?: number; message?: string }
  error?: string
}

type ProcessInboxResponse = {
  status: string
  sync?: StagePayload
  categorise?: StagePayload
  draft?: StagePayload
}

function summarizeResponse(data: ProcessInboxResponse): string {
  const parts: string[] = []

  if (data.sync?.status === "success") {
    const processed = data.sync.result?.processed
    if (processed && processed > 0) {
      parts.push(`${processed} new email${processed === 1 ? "" : "s"}`)
    } else if (data.sync.result?.message) {
      parts.push(data.sync.result.message)
    }
  }

  if (data.categorise?.status === "success") {
    const processed = data.categorise.result?.processed
    if (processed && processed > 0) {
      parts.push(`${processed} categorized`)
    }
  }

  if (data.draft?.status === "success") {
    const processed = data.draft.result?.processed
    if (processed && processed > 0) {
      parts.push(`${processed} draft${processed === 1 ? "" : "s"} generated`)
    }
  }

  if (parts.length > 0) {
    return parts.join(" · ")
  }

  return "Inbox is up to date."
}

export async function refreshInbox(): Promise<{
  error?: string
  summary?: string
}> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/sign-in")
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return {
      error:
        "Inbox refresh is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    }
  }

  let response: Response
  try {
    response = await fetch(
      `${url.replace(/\/$/, "")}/functions/v1/process-inbox`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          apikey: key,
        },
        body: "{}",
        cache: "no-store",
      }
    )
  } catch {
    return { error: "Could not reach the inbox processor." }
  }

  let data: ProcessInboxResponse | null = null
  try {
    data = (await response.json()) as ProcessInboxResponse
  } catch {
    data = null
  }

  if (!response.ok && response.status !== 207) {
    return {
      error: `Inbox refresh failed (${response.status}).`,
    }
  }

  revalidatePath("/")
  revalidatePath("/threads")
  revalidatePath("/sent")

  return { summary: data ? summarizeResponse(data) : "Inbox refreshed." }
}
