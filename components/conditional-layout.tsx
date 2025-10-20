"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { Navigation } from "./navigation"
import { useCurrentUser } from "@/hooks/use-current-user"

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, isLoading } = useCurrentUser()
  
  // Development bypass - skip authentication redirect in development
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // Check if this is a public view (no authentication required)
  const isPublicView = searchParams.get('public') === 'true'
  
  // Redirect unauthenticated users to login page (skip in development or public view)
  useEffect(() => {
    if (!isDevelopment && !isPublicView && !isLoading && !isAuthenticated && pathname !== "/login" && pathname !== "/access-denied") {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, pathname, router, isDevelopment, isPublicView])
  
  // Don't show navigation on login page, access denied page, or public view
  if (pathname === "/login" || pathname === "/access-denied" || isPublicView) {
    return <>{children}</>
  }
  
  // Show loading state while checking authentication (skip in development or public view)
  if (!isDevelopment && !isPublicView && isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }
  
  // Don't render content if not authenticated (skip in development or public view)
  if (!isDevelopment && !isPublicView && !isAuthenticated) {
    return null
  }
  
  return (
    <>
      <Navigation />
      {children}
    </>
  )
} 