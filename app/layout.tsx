import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { Toaster } from "sonner" // Import Toaster from sonner
// Temporarily disabled NextAuth components for debugging
// import { AuthProvider } from "@/components/auth-provider"
// import { AuthGuard } from "@/components/auth-guard"
import { ConditionalLayout } from "@/components/conditional-layout"
import { ClientSessionProvider } from "@/components/session-provider"

export const metadata: Metadata = {
  title: "Extraction Protocol: Code Black",
  description: "Navigate critical extraction scenarios in this immersive decision-based experience",
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
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
          <Toaster />
        </ClientSessionProvider>
      </body>
    </html>
  )
}
