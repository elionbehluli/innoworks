import { z } from "zod"

export const categoryFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(100, "Name must be 100 characters or fewer."),
  routing_rule: z
    .string()
    .trim()
    .min(1, "Routing rule is required.")
    .max(500, "Routing rule must be 500 characters or fewer."),
  prompt_template: z
    .string()
    .trim()
    .min(1, "Prompt template is required.")
    .max(10_000, "Prompt template must be 10,000 characters or fewer."),
})

export const createCategorySchema = categoryFieldsSchema

export const updateCategorySchema = categoryFieldsSchema.extend({
  id: z.string().uuid("Invalid category ID."),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
