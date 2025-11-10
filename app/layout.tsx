import type React from "react"
import type { Metadata } from "next"
import { Suspense } from "react"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { Toaster } from "sonner" // Import Toaster from sonner
// Temporarily disabled NextAuth components for debugging
// import { AuthProvider } from "@/components/auth-provider"
// import { AuthGuard } from "@/components/auth-guard"
import { ConditionalLayout } from "@/components/conditional-layout"
import { ClientSessionProvider } from "@/components/session-provider"
import { Spinner } from "@/components/ui/spinner"

export const metadata: Metadata = {
  title: "Edge of Survival",
  description: "Navigate critical survival scenarios in this immersive island survival experience",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={GeistSans.className}>
        <ClientSessionProvider>
          <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
              <Spinner className="h-8 w-8" />
            </div>
          }>
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
          </Suspense>
          <Toaster />
        </ClientSessionProvider>
      </body>
    </html>
  )
}
