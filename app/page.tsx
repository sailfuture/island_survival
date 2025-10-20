"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronRight, BookOpen, Calendar, GraduationCap } from "lucide-react"
import { useCurrentUser } from "@/hooks/use-current-user"
import { fetchAllStories } from "@/lib/api-service"

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

  useEffect(() => {
    async function loadStories() {
      try {
        console.log('Fetching available stories...')
        const storiesData = await fetchAllStories()
        console.log('Stories loaded:', storiesData)
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

  const handleStoryClick = (storyId: number) => {
    console.log('Navigating to story:', storyId)
    router.push(`/story/${storyId}`)
  }

  if (loading || isUserLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          <div className="mb-8">
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent className="pt-0">
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-3/4 mb-4" />
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Survival Stories
          </h1>
          <p className="text-sm text-muted-foreground">
            Choose your adventure and test your survival skills
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => (
              <Card 
                key={story.id} 
                className="cursor-pointer transition-all hover:shadow-md border-0 shadow-sm group"
                onClick={() => handleStoryClick(story.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {story.story_name}
              </CardTitle>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              </div>
                  <div className="flex gap-2">
                    {story.schoolYear && (
                      <Badge variant="secondary" className="text-xs">
                        <GraduationCap className="h-3 w-3 mr-1" />
                        {story.schoolYear}
                      </Badge>
                    )}
                    {story.schoolTerm && (
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        {story.schoolTerm}
                      </Badge>
                    )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
                  <CardDescription className="text-xs mb-4 line-clamp-2">
                    {story.story_description}
                  </CardDescription>
                  
                  {/* Story Image */}
                  {story.storyImage && (
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                      <img 
                        src={story.storyImage} 
                        alt={story.story_name}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                        onError={(e) => {
                          // Fallback to placeholder if image fails to load
                          e.currentTarget.src = "/placeholder.svg"
                        }}
                      />
                    </div>
                  )}
                  
                  {!story.storyImage && (
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                      <BookOpen className="h-10 w-10 text-muted-foreground" />
                            </div>
                  )}
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