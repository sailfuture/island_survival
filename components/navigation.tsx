"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useState, useMemo } from "react"
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
  const searchParams = useSearchParams()
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const { email } = useCurrentUser()

  // Determine the current stories_id from the URL
  const currentStoriesId = useMemo(() => {
    // Check if we're on a story page
    const storyMatch = pathname.match(/^\/story\/(\d+)/)
    if (storyMatch) {
      return parseInt(storyMatch[1])
    }
    
    // Check if we're on a decision page or crew-roles page with stories_id in query params
    const storiesIdParam = searchParams.get('stories_id')
    if ((pathname.startsWith('/decision/') || pathname.startsWith('/crew-roles')) && storiesIdParam) {
      return parseInt(storiesIdParam)
    }
    
    return null
  }, [pathname, searchParams])
  
  const showSettings = currentStoriesId !== null

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
              <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                <img 
                  src="/sailfuture-square (4).webp" 
                  alt="SailFuture Academy" 
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-xl font-bold">Survival Stories</span>
                {process.env.NODE_ENV === 'development' && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-mono">
                    DEV MODE
                  </span>
                )}
              </Link>
              
              {/* All Stories button - always visible on left side */}
              <Button variant="ghost" asChild size="sm">
                <Link href="/">
                  <span>All Stories</span>
                </Link>
              </Button>
            </div>
            
            <div className="flex items-center space-x-1">
              {/* Story-specific Dashboard button */}
              {showSettings && currentStoriesId && (
                <Button variant="ghost" asChild size="sm">
                  <Link href={`/story/${currentStoriesId}`}>
                    <span>Dashboard</span>
                  </Link>
                </Button>
              )}
              
              {showSettings && currentStoriesId && (
                <Button variant="ghost" asChild size="sm">
                  <Link href={`/crew-roles?stories_id=${currentStoriesId}`} className="flex items-center space-x-2">
                    <span>Crew Roles</span>
                  </Link>
                </Button>
              )}
              
              {showSettings && currentStoriesId && (
                <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                      <span>Settings</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[525px] max-h-[90vh]">
                    <DialogHeader>
                      <DialogTitle>Story Settings</DialogTitle>
                      <DialogDescription>
                        Configure your crew settings for this story.
                      </DialogDescription>
                    </DialogHeader>
                    <SettingsForm 
                      onFormSubmitSuccess={handleSettingsSubmitSuccess}
                      storiesId={currentStoriesId}
                    />
                  </DialogContent>
                </Dialog>
              )}

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