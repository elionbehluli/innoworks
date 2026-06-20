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

  const { data: lastCategory } = await supabase
    .from("categories")
    .select("sort_order")
    .neq("status_id", DELETED_STATUS_ID)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()

  const sortOrder = (lastCategory?.sort_order ?? -1) + 1

  const { error } = await supabase.from("categories").insert({
    name,
    routing_rule,
    prompt_template,
    sort_order: sortOrder,
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

export async function moveCategory(
  id: string,
  direction: "up" | "down"
): Promise<{ error?: string }> {
  const supabase = await requireAdmin()

  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, sort_order")
    .neq("status_id", DELETED_STATUS_ID)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })

  if (error || !categories?.length) {
    return { error: error?.message ?? "No categories to reorder." }
  }

  const index = categories.findIndex((category) => category.id === id)
  if (index === -1) {
    return { error: "Category not found." }
  }

  const swapIndex = direction === "up" ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= categories.length) {
    return {}
  }

  const current = categories[index]
  const neighbor = categories[swapIndex]

  const { error: firstError } = await supabase
    .from("categories")
    .update({ sort_order: neighbor.sort_order })
    .eq("id", current.id)

  if (firstError) {
    return { error: firstError.message }
  }

  const { error: secondError } = await supabase
    .from("categories")
    .update({ sort_order: current.sort_order })
    .eq("id", neighbor.id)

  if (secondError) {
    return { error: secondError.message }
  }

  revalidatePath("/categories")
  return {}
}
