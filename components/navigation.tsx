"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { SettingsForm } from "./settings-form"
import { useCurrentUser } from "@/hooks/use-current-user"
import { signOut } from "next-auth/react"

export function Navigation() {
  const pathname = usePathname()
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const { email } = useCurrentUser()

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/crew-roles", label: "Crew Roles" },
  ]

  const handleSettingsSubmitSuccess = () => {
    setIsSettingsModalOpen(false)
  }

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" })
  }

  return (
    <>
      <nav className="sticky top-0 z-50 border-b bg-white">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/sailfuture-square (4).webp" 
                alt="SailFuture Academy" 
                className="w-8 h-8 rounded-full"
              />
              <span className="text-xl font-bold">Edge of Survival</span>
              {process.env.NODE_ENV === 'development' && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-mono">
                  DEV MODE
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1">
              {navItems.map((item) => (
                <Button key={item.href} variant={pathname === item.href ? "outline" : "ghost"} asChild size="sm">
                  <Link href={item.href} className="flex items-center space-x-2">
                    <span>{item.label}</span>
                  </Link>
                </Button>
              ))}
              
              <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                    <span>Settings</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                  <DialogHeader>
                    <DialogTitle>Crew Settings</DialogTitle>
                    <DialogDescription>
                      Configure your crew details, survival tribe name, and team information. Changes will be saved to your profile.
                    </DialogDescription>
                  </DialogHeader>
                  <SettingsForm onFormSubmitSuccess={handleSettingsSubmitSuccess} />
                </DialogContent>
              </Dialog>

              <Button variant="ghost" size="sm" onClick={handleLogout} className="flex items-center space-x-2">
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>
    </>
  )
} 