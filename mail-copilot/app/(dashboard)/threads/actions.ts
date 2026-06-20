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
import { draftReplySchema } from "@/lib/validations/thread"
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

export async function approveAndSendThread(
  threadId: string,
  draftReply: string
): Promise<{ error?: string }> {
  const parsed = draftReplySchema.safeParse({ draft: draftReply })
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid draft reply.",
    }
  }

  const trimmedDraft = parsed.data.draft

  const { supabase } = await requireUser()

  const { data: thread, error: fetchError } = await supabase
    .from("threads")
    .select("id, gmail_thread_id, sender, subject, category_id, body_text, snippet")
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
    return { error: "Thread must be categorized before sending a reply." }
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

  try {
    await sendGmailReply({
      threadId: thread.gmail_thread_id,
      sender: thread.sender,
      subject: thread.subject,
      body: trimmedDraft,
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send email via Gmail."
    return { error: message }
  }

  const { data, error } = await supabase
    .from("threads")
    .update({
      ai_draft_reply: trimmedDraft,
      status: "RESOLVED",
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
      categoryId: thread.category_id,
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
  revalidatePath(`/threads/${threadId}`)
  redirect("/threads")
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
