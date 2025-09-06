"use client"

import { useSession } from "next-auth/react"

export function useCurrentUser() {
  const { data: session, status } = useSession()
  
  // Development bypass - only works in development environment
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  if (isDevelopment) {
    // Use a known test email that exists in the database for development testing
    const devEmail = "hthompson@sailfuture.org"
    return {
      email: devEmail,
      isLoading: false,
      isAuthenticated: true,
    }
  }
  
  // Production - use real Google OAuth
  return {
    email: session?.user?.email || "",
    isLoading: status === "loading",
    isAuthenticated: !!session?.user?.email,
  }
} 