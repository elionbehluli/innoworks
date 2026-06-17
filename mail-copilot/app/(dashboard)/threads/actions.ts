"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/utils/supabase/server"

export async function claimThread(threadId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/sign-in")
  }

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
