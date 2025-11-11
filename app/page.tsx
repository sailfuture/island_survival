"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, BookOpen, Calendar, GraduationCap } from "lucide-react"
import { useCurrentUser } from "@/hooks/use-current-user"
import { fetchAllStories } from "@/lib/api-service"
import { Spinner } from "@/components/ui/spinner"

interface Story {
  id: number
  created_at: string
  story_name: string
  story_description: string
  schoolYear: string
  schoolTerm: string
  storyImage: string
}

export default function HomePage() {
  const router = useRouter()
  const { email: userEmail, isLoading: isUserLoading } = useCurrentUser()
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [initializingStory, setInitializingStory] = useState(false)

  useEffect(() => {
    async function loadStories() {
      try {
        const storiesData = await fetchAllStories()
        setStories(storiesData)
      } catch (error) {
        console.error('Error fetching stories:', error)
        setStories([])
    } finally {
      setLoading(false)
    }
  }

    loadStories()
  }, [])

  const handleStoryClick = async (storyId: number) => {
    setInitializingStory(true)
    
    // Call create_new_story before navigating to initialize the story for this user
    if (userEmail) {
      try {
        const XANO_BASE_URL = "https://xsc3-mvx7-r86m.n7e.xano.io/api:7l5S8ZC7"
        console.log('🎬 Creating new story instance for user:', userEmail, 'story:', storyId)
        
        const createResponse = await fetch(`${XANO_BASE_URL}/create_new_story?user_email=${encodeURIComponent(userEmail)}&stories_id=${storyId}`)
        
        console.log('🎬 Create story response status:', createResponse.status)
        
        if (createResponse.ok) {
          const responseData = await createResponse.json()
          console.log('✅ Story instance created:', responseData)
        } else {
          const errorText = await createResponse.text()
          console.warn('⚠️ Create story returned non-ok status:', createResponse.status, errorText)
          // Continue anyway - might already exist
        }
      } catch (error) {
        console.error('❌ Error creating story instance:', error)
        // Continue to navigation even if this fails
      }
    }
    
    router.push(`/story/${storyId}`)
  }

  if (loading || isUserLoading || initializingStory) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Spinner className="h-8 w-8 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            {initializingStory ? 'Starting your adventure...' : 'Loading stories...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Survival Stories
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose your adventure and test your survival skills through immersive decision-based stories
          </p>
        </div>

        {/* Stories Grid */}
        {stories.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-base font-semibold mb-1">No Stories Available</h3>
            <p className="text-sm text-muted-foreground">
              Check back later for new survival adventures!
            </p>
              </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => (
              <Card 
                key={story.id} 
                className={`transition-all hover:shadow-xl border-0 shadow-md group overflow-hidden ${
                  initializingStory ? 'opacity-50 cursor-wait' : 'cursor-pointer'
                }`}
                onClick={() => !initializingStory && handleStoryClick(story.id)}
              >
                {/* Story Image Hero */}
                {story.storyImage ? (
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img 
                      src={story.storyImage} 
                      alt={story.story_name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg"
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    
                    {/* Title Overlay on Image */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <div className="flex gap-2 mb-2">
                        {story.schoolYear && (
                          <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30 backdrop-blur-sm">
                            {story.schoolYear}
                          </Badge>
                        )}
                        {story.schoolTerm && (
                          <Badge variant="outline" className="text-xs bg-black/20 text-white border-white/30 backdrop-blur-sm">
                            {story.schoolTerm}
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-2xl font-bold mb-1 group-hover:text-white transition-colors">
                        {story.story_name}
                      </h3>
                    </div>
                    
                    {/* Chevron Icon */}
                    <div className="absolute top-4 right-4">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 group-hover:bg-white/30 transition-colors">
                        <ChevronRight className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative aspect-[16/10] bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <BookOpen className="h-16 w-16 text-white/50" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <div className="flex gap-2 mb-2">
                        {story.schoolYear && (
                          <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                            {story.schoolYear}
                          </Badge>
                        )}
                        {story.schoolTerm && (
                          <Badge variant="outline" className="text-xs bg-black/20 text-white border-white/30">
                            {story.schoolTerm}
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-2xl font-bold mb-1">
                        {story.story_name}
                      </h3>
                    </div>
                    <div className="absolute top-4 right-4">
                      <div className="bg-white/20 rounded-full p-2 group-hover:bg-white/30 transition-colors">
                        <ChevronRight className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Description */}
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {story.story_description}
                  </p>
                  <div className="mt-4 flex items-center text-sm font-medium text-primary group-hover:gap-2 transition-all">
                    <span>Begin Adventure</span>
                    <ChevronRight className="h-4 w-4 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* User Info */}
        {userEmail && (
          <div className="mt-8 text-center text-xs text-muted-foreground">
            Logged in as: {userEmail}
              </div>
        )}
      </div>
    </div>
  )
}