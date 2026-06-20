import { z } from "zod"

export const draftReviewSchema = z.object({
  subject: z
    .string()
    .trim()
    .max(500, "Subject must be 500 characters or fewer.")
    .optional(),
  draft: z
    .string()
    .trim()
    .min(1, "Draft reply cannot be empty.")
    .max(50_000, "Draft reply must be 50,000 characters or fewer."),
})

export type DraftReviewInput = z.infer<typeof draftReviewSchema>

/** @deprecated Use draftReviewSchema */
export const draftReplySchema = draftReviewSchema

/** @deprecated Use DraftReviewInput */
export type DraftReplyInput = DraftReviewInput
