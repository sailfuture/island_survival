"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useSession } from "next-auth/react"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, status } = useSession()

  useEffect(() => {
    // If not loading and not authenticated, redirect to login
    if (status === "loading") return
    
    if (!session && pathname !== "/login") {
      router.push("/login")
    }
  }, [session, status, pathname, router])

  // Show loading while checking authentication
  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">Loading...</div>
    </div>
  }

  // If on login page, always show it
  if (pathname === "/login") {
    return <>{children}</>
  }

  // If authenticated, show the content
  if (session) {
    return <>{children}</>
  }

  // Otherwise show nothing (redirect will happen)
  return null
} 