"use client"

import { getFormProps, getInputProps, useForm } from "@conform-to/react"
import { parseWithZod } from "@conform-to/zod"
import { Loader2Icon } from "lucide-react"
import { useActionState } from "react"

import { Form, FormItem, FormSubmit, Input, Label } from "~/components/ui"
import { createSignInWithCodeSchema } from "~/lib/validation/forms"
import { signInWithCode } from "~/server/actions/auth"

export default function SignInWithCodeForm() {
  const [lastResult, action] = useActionState(signInWithCode, undefined)
  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: createSignInWithCodeSchema() })
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  })

  return (
    <Form {...getFormProps(form)} action={action}>
      <FormItem>
        <Label htmlFor={fields.email.id}>Email address</Label>

        <Input
          {...getInputProps(fields.email, { type: "email" })}
          autoComplete="email"
        />
      </FormItem>

      <FormSubmit
        className="w-full"
        renderLoading={
          <>
            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        }
      >
        Send a sign in code
      </FormSubmit>
    </Form>
  )
}
