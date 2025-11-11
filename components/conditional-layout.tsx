"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, Suspense } from "react"
import { Navigation } from "./navigation"
import { useCurrentUser } from "@/hooks/use-current-user"
import { Spinner } from "@/components/ui/spinner"

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, isLoading } = useCurrentUser()
  
  // Development bypass - skip authentication redirect in development
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // Check if this is a public view (no authentication required)
  const isPublicView = searchParams.get('public') === 'true'
  
  // Redirect unauthenticated users to login page (skip in development, public view, or public crew roles)
  useEffect(() => {
    if (!isDevelopment && !isPublicView && !isLoading && !isAuthenticated && 
        pathname !== "/login" && pathname !== "/access-denied" && pathname !== "/crew-roles/public") {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, pathname, router, isDevelopment, isPublicView])
  
  // Don't show navigation on login page, access denied page, public view, or public crew roles
  if (pathname === "/login" || pathname === "/access-denied" || pathname === "/crew-roles/public" || isPublicView) {
    return <>{children}</>
  }
  
  // Show loading state while checking authentication (skip in development or public view)
  if (!isDevelopment && !isPublicView && isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }
  
  // Don't render content if not authenticated (skip in development, public view, or public crew roles)
  const isPublicCrewRoles = pathname === "/crew-roles/public"
  if (!isDevelopment && !isPublicView && !isPublicCrewRoles && !isAuthenticated) {
    return null
  }
  
  return (
    <>
      <Suspense fallback={<div className="h-16 border-b bg-white" />}>
        <Navigation />
      </Suspense>
      {children}
    </>
  )
} 