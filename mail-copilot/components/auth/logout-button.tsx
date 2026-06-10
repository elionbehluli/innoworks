"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/utils/supabase/client"

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    setIsLoading(true)

    const supabase = createClient()
    await supabase.auth.signOut()

    router.push("/sign-in")
    router.refresh()
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn("w-full justify-start", className)}
      onClick={handleLogout}
      disabled={isLoading}
    >
      <LogOut />
      {isLoading ? "Logging out..." : "Log out"}
    </Button>
  )
}
