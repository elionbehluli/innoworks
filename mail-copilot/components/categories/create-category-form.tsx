"use client"

import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { createCategory } from "@/app/(dashboard)/categories/actions"
import { Button } from "@/components/ui/button"
import {
  FormField,
  FormRootError,
  formFieldClassName,
} from "@/components/ui/form-field"
import {
  createCategorySchema,
  type CreateCategoryInput,
} from "@/lib/validations/category"

export function CreateCategoryForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: "",
      routing_rule: "",
      prompt_template: "",
    },
  })

  const onSubmit = handleSubmit(async (data) => {
    const result = await createCategory(data)
    if (result?.error) {
      setError("root", { message: result.error })
    }
  })

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-4">
      <FormField id="name" label="Name" error={errors.name?.message}>
        <input
          id="name"
          type="text"
          placeholder="e.g. Support"
          className={formFieldClassName}
          aria-invalid={Boolean(errors.name)}
          {...register("name")}
        />
      </FormField>

      <FormField
        id="routing_rule"
        label="Routing rule"
        error={errors.routing_rule?.message}
      >
        <input
          id="routing_rule"
          type="text"
          placeholder="e.g. from:support@company.com"
          className={formFieldClassName}
          aria-invalid={Boolean(errors.routing_rule)}
          {...register("routing_rule")}
        />
      </FormField>

      <FormField
        id="prompt_template"
        label="Prompt template"
        error={errors.prompt_template?.message}
      >
        <textarea
          id="prompt_template"
          rows={6}
          placeholder="Instructions for handling emails in this category..."
          className={formFieldClassName}
          aria-invalid={Boolean(errors.prompt_template)}
          {...register("prompt_template")}
        />
      </FormField>

      <FormRootError message={errors.root?.message} />

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create category"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/categories">Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
