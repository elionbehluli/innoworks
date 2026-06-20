"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  createCategorySchema,
  updateCategorySchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "@/lib/validations/category"
import { requireAdmin } from "@/lib/utils/supabase/auth"

const DELETED_STATUS_ID = 2

export async function createCategory(
  input: CreateCategoryInput
): Promise<{ error?: string }> {
  const parsed = createCategorySchema.safeParse(input)
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid category data.",
    }
  }

  const supabase = await requireAdmin()
  const { name, routing_rule, prompt_template } = parsed.data

  const { error } = await supabase.from("categories").insert({
    name,
    routing_rule,
    prompt_template,
  })

  if (error) {
    return { error: error.message }
  }

  redirect("/categories")
}

export async function updateCategory(
  input: UpdateCategoryInput
): Promise<{ error?: string }> {
  const parsed = updateCategorySchema.safeParse(input)
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid category data.",
    }
  }

  const supabase = await requireAdmin()
  const { id, name, routing_rule, prompt_template } = parsed.data

  const { error } = await supabase
    .from("categories")
    .update({
      name,
      routing_rule,
      prompt_template,
    })
    .eq("id", id)
    .neq("status_id", DELETED_STATUS_ID)

  if (error) {
    return { error: error.message }
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
