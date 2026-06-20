"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { requireAdmin } from "@/lib/utils/supabase/auth"

export async function createCategory(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const supabase = await requireAdmin()

  const name = (formData.get("name") as string)?.trim()
  const routingRule = (formData.get("routing_rule") as string)?.trim()
  const promptTemplate = (formData.get("prompt_template") as string)?.trim()

  if (!name || !routingRule || !promptTemplate) {
    return "All fields are required."
  }

  const { error } = await supabase.from("categories").insert({
    name,
    routing_rule: routingRule,
    prompt_template: promptTemplate,
  })

  if (error) {
    return error.message
  }

  redirect("/categories")
}

const DELETED_STATUS_ID = 2

export async function updateCategory(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const supabase = await requireAdmin()

  const id = (formData.get("id") as string)?.trim()
  const name = (formData.get("name") as string)?.trim()
  const routingRule = (formData.get("routing_rule") as string)?.trim()
  const promptTemplate = (formData.get("prompt_template") as string)?.trim()

  if (!id || !name || !routingRule || !promptTemplate) {
    return "All fields are required."
  }

  const { error } = await supabase
    .from("categories")
    .update({
      name,
      routing_rule: routingRule,
      prompt_template: promptTemplate,
    })
    .eq("id", id)
    .neq("status_id", DELETED_STATUS_ID)

  if (error) {
    return error.message
  }

  redirect("/categories")
}

export async function inactivateCategory(id: string) {
  const supabase = await requireAdmin()

  const { error } = await supabase
    .from("categories")
    .update({ status_id: 3 })
    .eq("id", id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/categories")
}

export async function deleteCategory(id: string) {
  const supabase = await requireAdmin()

  const { error } = await supabase
    .from("categories")
    .update({ status_id: 2 })
    .eq("id", id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/categories")
}
