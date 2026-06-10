"use client"

import { useActionState } from "react"
import Link from "next/link"

import { createCategory } from "@/app/(dashboard)/categories/actions"
import { Button } from "@/components/ui/button"

const fieldClassName =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function CreateCategoryForm() {
  const [error, formAction, isPending] = useActionState(
    createCategory,
    null
  )

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className={fieldClassName}
          placeholder="e.g. Support"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="routing_rule" className="text-sm font-medium">
          Routing rule
        </label>
        <input
          id="routing_rule"
          name="routing_rule"
          type="text"
          required
          className={fieldClassName}
          placeholder="e.g. from:support@company.com"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="prompt_template" className="text-sm font-medium">
          Prompt template
        </label>
        <textarea
          id="prompt_template"
          name="prompt_template"
          required
          rows={6}
          className={fieldClassName}
          placeholder="Instructions for handling emails in this category..."
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create category"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/categories">Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
