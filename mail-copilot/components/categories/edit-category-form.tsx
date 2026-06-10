"use client"

import { useActionState } from "react"
import Link from "next/link"

import { updateCategory } from "@/app/(dashboard)/categories/actions"
import { Button } from "@/components/ui/button"

const fieldClassName =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function EditCategoryForm({
  category,
}: {
  category: {
    id: string
    name: string
    routing_rule: string
    prompt_template: string
  }
}) {
  const [error, formAction, isPending] = useActionState(updateCategory, null)

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <input type="hidden" name="id" value={category.id} />

      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={category.name}
          className={fieldClassName}
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
          defaultValue={category.routing_rule}
          className={fieldClassName}
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
          defaultValue={category.prompt_template}
          className={fieldClassName}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save changes"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/categories">Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
