"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { sendGmailReply } from "@/lib/gmail/send-reply"
import {
  buildFullThreadHistory,
  getExistingThreadHistory,
  getLatestInboundText,
  savePastReply,
} from "@/lib/rag/save-past-reply"
import { draftReviewSchema } from "@/lib/validations/thread"
import { createClient } from "@/lib/utils/supabase/server"

async function requireUser() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/sign-in")
  }

  return { supabase, user }
}

type ThreadForAction = {
  id: string
  gmail_thread_id: string
  sender: string
  subject: string
  category_id: string | null
  body_text: string | null
  snippet: string | null
  tracking_token: string
  sent_at: string | null
  status: string
}

async function loadActionableThread(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  threadId: string
): Promise<{ thread?: ThreadForAction; error?: string }> {
  const { data: thread, error: fetchError } = await supabase
    .from("threads")
    .select(
      "id, gmail_thread_id, sender, subject, category_id, body_text, snippet, tracking_token, sent_at, status"
    )
    .eq("id", threadId)
    .in("status", ["PENDING", "IN_PROGRESS"])
    .single()

  if (fetchError || !thread) {
    return {
      error:
        fetchError?.message ??
        "Thread could not be found. It may have already been handled.",
    }
  }

  if (!thread.category_id) {
    return { error: "Thread must be categorized before approving a reply." }
  }

  return { thread }
}

export async function claimThread(threadId: string) {
  const { supabase, user } = await requireUser()

  const { data, error } = await supabase
    .from("threads")
    .update({ assigned_to: user.id, status: "IN_PROGRESS" })
    .eq("id", threadId)
    .eq("status", "PENDING")
    .is("assigned_to", null)
    .select("id")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Thread is no longer available to claim.")
  }

  revalidatePath("/threads")
  revalidatePath(`/threads/${threadId}`)
  redirect(`/threads/${threadId}`)
}

export async function saveDraftReply(
  threadId: string,
  input: { draft: string; subject?: string }
): Promise<{ error?: string }> {
  const parsed = draftReviewSchema.safeParse(input)
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid draft reply.",
    }
  }

  const { supabase } = await requireUser()
  const loaded = await loadActionableThread(supabase, threadId)
  if (loaded.error || !loaded.thread) {
    return { error: loaded.error }
  }

  const trimmedDraft = parsed.data.draft
  const draftSubject = parsed.data.subject?.trim() || null

  const { data, error } = await supabase
    .from("threads")
    .update({
      ai_draft_reply: trimmedDraft,
      ai_draft_subject: draftSubject,
    })
    .eq("id", threadId)
    .in("status", ["PENDING", "IN_PROGRESS"])
    .select("id")
    .single()

  if (error || !data) {
    return {
      error: error?.message ?? "Draft could not be saved.",
    }
  }

  revalidatePath("/threads")
  revalidatePath(`/threads/${threadId}`)
  return {}
}

export async function sendThreadNow(
  threadId: string,
  input: { draft: string; subject?: string }
): Promise<{ error?: string }> {
  const parsed = draftReviewSchema.safeParse(input)
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid draft reply.",
    }
  }

  const trimmedDraft = parsed.data.draft
  const draftSubject = parsed.data.subject?.trim() || null

  const { supabase } = await requireUser()
  const loaded = await loadActionableThread(supabase, threadId)
  if (loaded.error || !loaded.thread) {
    return { error: loaded.error }
  }

  const thread = loaded.thread

  if (thread.sent_at) {
    return { error: "This thread was already sent." }
  }

  const inboundEmail = getLatestInboundText(thread)
  if (!inboundEmail) {
    return { error: "Thread has no inbound email content to save for RAG." }
  }

  let existingThreadHistory
  try {
    existingThreadHistory = await getExistingThreadHistory(
      supabase,
      thread.gmail_thread_id
    )
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load thread history."
    return { error: message }
  }

  const fullThreadHistory = buildFullThreadHistory(
    existingThreadHistory,
    inboundEmail,
    trimmedDraft
  )

  const sentAt = new Date().toISOString()

  const { error: sentAtError } = await supabase
    .from("threads")
    .update({ sent_at: sentAt })
    .eq("id", threadId)
    .in("status", ["PENDING", "IN_PROGRESS"])
    .is("sent_at", null)

  if (sentAtError) {
    return { error: sentAtError.message }
  }

  try {
    await sendGmailReply({
      threadId: thread.gmail_thread_id,
      sender: thread.sender,
      subject: thread.subject,
      draftSubject,
      body: trimmedDraft,
      trackingToken: thread.tracking_token,
      sentAt,
    })
  } catch (err) {
    await supabase
      .from("threads")
      .update({ sent_at: null })
      .eq("id", threadId)

    const message =
      err instanceof Error ? err.message : "Failed to send email via Gmail."
    return { error: message }
  }

  const { data, error } = await supabase
    .from("threads")
    .update({
      ai_draft_reply: trimmedDraft,
      ai_draft_subject: draftSubject,
      status: "RESOLVED",
      sent_at: sentAt,
    })
    .eq("id", threadId)
    .in("status", ["PENDING", "IN_PROGRESS"])
    .select("id")
    .single()

  if (error || !data) {
    return {
      error:
        error?.message ??
        "Email was sent, but the thread could not be marked as resolved.",
    }
  }

  try {
    await savePastReply(supabase, {
      gmailThreadId: thread.gmail_thread_id,
      sender: thread.sender,
      categoryId: thread.category_id!,
      inboundEmail,
      outboundReply: trimmedDraft,
      threadHistory: fullThreadHistory,
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save conversation history."
    return {
      error: `Email was sent, but training data could not be saved: ${message}`,
    }
  }

  revalidatePath("/threads")
  revalidatePath("/sent")
  revalidatePath(`/threads/${threadId}`)
  redirect("/sent")
}

/** @deprecated Use sendThreadNow */
export async function approveAndSendThread(
  threadId: string,
  draftReply: string
): Promise<{ error?: string }> {
  return sendThreadNow(threadId, { draft: draftReply })
}

export async function skipThread(
  threadId: string
): Promise<{ error?: string }> {
  const { supabase } = await requireUser()

  const { data, error } = await supabase
    .from("threads")
    .update({ status: "SKIPPED" })
    .eq("id", threadId)
    .in("status", ["PENDING", "IN_PROGRESS"])
    .select("id")
    .single()

  if (error || !data) {
    return {
      error:
        error?.message ??
        "Thread could not be skipped. It may have already been handled.",
    }
  }

  revalidatePath("/threads")
  redirect("/threads")
}
