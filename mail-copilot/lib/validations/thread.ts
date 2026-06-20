import { z } from "zod"

export const draftReplySchema = z.object({
  draft: z
    .string()
    .trim()
    .min(1, "Draft reply cannot be empty.")
    .max(50_000, "Draft reply must be 50,000 characters or fewer."),
})

export type DraftReplyInput = z.infer<typeof draftReplySchema>
