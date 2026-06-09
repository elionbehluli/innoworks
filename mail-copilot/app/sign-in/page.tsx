import { redirect } from "next/navigation"
import { cookies } from "next/headers"

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"
import { createClient } from "@/lib/utils/supabase/server"

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/")
  }

  const { error } = await searchParams

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-medium tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to Mail Copilot with your Google account.
          </p>
        </div>

        {error === "auth" && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
            Something went wrong during sign in. Please try again.
          </p>
        )}

        <GoogleSignInButton />

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our terms of service and privacy policy.
        </p>
      </div>
    </div>
  )
}
