"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { Navigation } from "./navigation"
import { useCurrentUser } from "@/hooks/use-current-user"

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, isLoading } = useCurrentUser()
  
  // Development bypass - skip authentication redirect in development
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // Redirect unauthenticated users to login page (skip in development)
  useEffect(() => {
    if (!isDevelopment && !isLoading && !isAuthenticated && pathname !== "/login" && pathname !== "/access-denied") {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, pathname, router, isDevelopment])
  
  // Don't show navigation on login page or access denied page
  if (pathname === "/login" || pathname === "/access-denied") {
    return <>{children}</>
  }
  
  // Show loading state while checking authentication (skip in development)
  if (!isDevelopment && isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }
  
  // Don't render content if not authenticated (skip in development)
  if (!isDevelopment && !isAuthenticated) {
    return null
  }
  
  return (
    <>
      <Navigation />
      {children}
    </>
  )
} 