"use client"

import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { updateCategory } from "@/app/(dashboard)/categories/actions"
import { Button } from "@/components/ui/button"
import {
  FormField,
  FormRootError,
  formFieldClassName,
} from "@/components/ui/form-field"
import {
  updateCategorySchema,
  type UpdateCategoryInput,
} from "@/lib/validations/category"

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
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdateCategoryInput>({
    resolver: zodResolver(updateCategorySchema),
    defaultValues: {
      id: category.id,
      name: category.name,
      routing_rule: category.routing_rule,
      prompt_template: category.prompt_template,
    },
  })

  const onSubmit = handleSubmit(async (data) => {
    const result = await updateCategory(data)
    if (result?.error) {
      setError("root", { message: result.error })
    }
  })

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-4">
      <input type="hidden" {...register("id")} />

      <FormField id="name" label="Name" error={errors.name?.message}>
        <input
          id="name"
          type="text"
          className={formFieldClassName}
          aria-invalid={Boolean(errors.name)}
          {...register("name")}
        />
      </FormField>

      <FormField
        id="routing_rule"
        label="AI routing description"
        error={errors.routing_rule?.message}
        description="Plain-language definition the AI uses to decide if an email belongs here."
      >
        <textarea
          id="routing_rule"
          rows={3}
          className={formFieldClassName}
          aria-invalid={Boolean(errors.routing_rule)}
          {...register("routing_rule")}
        />
      </FormField>

      <FormField
        id="prompt_template"
        label="Prompt template"
        error={errors.prompt_template?.message}
        description="Supports {{senderName}}, {{subject}}, {{body}}, {{threadContext}}."
      >
        <textarea
          id="prompt_template"
          rows={6}
          className={formFieldClassName}
          aria-invalid={Boolean(errors.prompt_template)}
          {...register("prompt_template")}
        />
      </FormField>

      <FormRootError message={errors.root?.message} />

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save changes"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/categories">Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
