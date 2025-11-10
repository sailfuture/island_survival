"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ChevronRight, BookOpen } from "lucide-react"
import { toast } from "sonner"
import { useCurrentUser } from "@/hooks/use-current-user"
import { MarkdownContent } from "@/components/markdown-content"
import { Item, ItemGroup, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item"

interface UserDecision {
  id: number
  created_at: number
  decision_id: string
  email: string
  morale_after: number
  shipcondition_after: number
  resources_after: number
  current_story: number
  complete: boolean
  decision_number: number
  stories_id: number
  story_details?: {
    id: number
    decision_id: string
    decision_title: string
    story_summary: string
  }
  story_sequence?: {
    id: number
    decision_number: number
    current_story_id: number
    choice_type: string
    previous_stories: number[]
    next_stories: number[]
    stories_id: number
  }
}

interface Story {
  id: number
  story_name: string
  story_description: string
  schoolYear: string
  schoolTerm: string
  storyImage: string
}

interface UserSettings {
  id?: number
  email: string
  vessel_name: string
  crew_name: string
  crew_leader_name: string
  crew_captain_name: string
  stories_id: number
}

export default function StoryPage() {
  const router = useRouter()
  const params = useParams()
  const storyId = parseInt(params.id as string)
  
  // Use the same Island Survival API for all stories, but filter by stories_id
  const XANO_BASE_URL = "https://xsc3-mvx7-r86m.n7e.xano.io/api:7l5S8ZC7"
  
  const { email: userEmail, isLoading: isUserLoading } = useCurrentUser()
  const effectiveEmail = userEmail

  const [story, setStory] = useState<Story | null>(null)
  const [userMadeDecisions, setUserMadeDecisions] = useState<UserDecision[]>([])
  const [userSettings, setUserSettings] = useState<UserSettings>({
    email: effectiveEmail || "",
    vessel_name: "",
    crew_name: "",
    crew_leader_name: "",
    crew_captain_name: "",
    stories_id: storyId
  })
  const [loading, setLoading] = useState(true)
  const [activeDecisionId, setActiveDecisionId] = useState<string | null>(null)

  useEffect(() => {
    if (!isUserLoading && storyId && effectiveEmail) {
      fetchStoryData()
    }
  }, [isUserLoading, storyId, effectiveEmail])

  async function fetchStoryData() {
    try {
      setLoading(true)
      
      // Reset all state to prevent showing stale data from previous story
      setUserMadeDecisions([])
      setActiveDecisionId(null)
      setUserSettings({
        email: effectiveEmail || "",
        vessel_name: "",
        crew_name: "",
        crew_leader_name: "",
        crew_captain_name: "",
        stories_id: storyId
      })

      // Fetch story details
      const storyResponse = await fetch(`${XANO_BASE_URL}/stories/${storyId}`)
      if (storyResponse.ok) {
        const storyData = await storyResponse.json()
        setStory(storyData)
      }

      if (effectiveEmail) {
        // Create new story instance for user if needed
        await fetch(`${XANO_BASE_URL}/create_new_story?user_email=${encodeURIComponent(effectiveEmail)}&stories_id=${storyId}`)

        // Fetch ALL user's score records (complete decision history)
        const userAllScoresUrl = `${XANO_BASE_URL}/user_all_scores?user_email=${encodeURIComponent(effectiveEmail)}&stories_id=${storyId}`
        const userAllScoresResponse = await fetch(userAllScoresUrl)
        if (userAllScoresResponse.ok) {
          const userAllScoresData = await userAllScoresResponse.json()
          
          if (userAllScoresData && userAllScoresData.score_records && Array.isArray(userAllScoresData.score_records)) {
            // Enrich score_records with decision_title by fetching each story
            const enrichedRecords = await Promise.all(
              userAllScoresData.score_records.map(async (record: any) => {
                try {
                  // Fetch story details for this decision
                  const storyUrl = `${XANO_BASE_URL}/stories_individual?story_id_name=${encodeURIComponent(record.decision_id)}&stories_id=${storyId}&user_email=${encodeURIComponent(effectiveEmail)}`
                  const storyResponse = await fetch(storyUrl)
                  
                  if (storyResponse.ok) {
                    const storyData = await storyResponse.json()
                    
                    // Extract decision_title from result1
                    if (storyData.result1 && Array.isArray(storyData.result1) && storyData.result1.length > 0) {
                      const storyInfo = storyData.result1[0]
                      return {
                        ...record,
                        story_details: {
                          id: storyInfo.id,
                          decision_id: storyInfo.decision_id,
                          decision_title: storyInfo.decision_title,
                          story_summary: storyInfo.story_summary || ''
                        }
                      }
                    }
                  }
                } catch (error) {
                  console.error(`Error fetching story for ${record.decision_id}:`, error)
                }
                
                // Return record without enrichment if fetch failed
                return record
              })
            )
            
            setUserMadeDecisions(enrichedRecords)
            
            // Get active decision_id from score_records
            if (userAllScoresData.score_records.length > 0) {
              const latestRecord = userAllScoresData.score_records[userAllScoresData.score_records.length - 1]
              setActiveDecisionId(latestRecord.decision_id)
            }
          }
        }

        // Fetch user settings from island_survival_settings endpoint
        try {
          const settingsUrl = `${XANO_BASE_URL}/island_survival_settings?stories_id=${storyId}&user_email=${encodeURIComponent(effectiveEmail)}`
          const settingsResponse = await fetch(settingsUrl)
          if (settingsResponse.ok) {
            const settingsData = await settingsResponse.json()
            
            // Handle both array and single object responses
            // Filter by email and stories_id as safety measure
            const userSettingsArray = Array.isArray(settingsData) 
              ? settingsData.filter((s: any) => s.email === effectiveEmail && s.stories_id === storyId)
              : (settingsData.id && settingsData.email === effectiveEmail && settingsData.stories_id === storyId) ? [settingsData] : []

            if (userSettingsArray.length > 0) {
              const latestSettings = userSettingsArray.reduce((latest: any, current: any) => {
                return (current.created_at || 0) > (latest.created_at || 0) ? current : latest
              })
              setUserSettings({
                id: latestSettings.id,
                email: latestSettings.email || effectiveEmail || "",
                vessel_name: latestSettings.vessel_name || "",
                crew_name: latestSettings.crew_name || "",
                crew_leader_name: latestSettings.crew_leader_name || "",
                crew_captain_name: latestSettings.crew_captain_name || "",
                stories_id: latestSettings.stories_id || storyId
              })
            }
          }
        } catch (settingsError) {
          // Continue without settings - page should still load
        }

      }
    } catch (error) {
      console.error('Error fetching story data:', error)
      toast.error('Failed to load story data')
    } finally {
      setLoading(false)
    }
  }

  const handleDecisionClick = (decision: UserDecision) => {
    // Navigate using decision_id with historical stats and score_record_id
    router.push(`/decision/${encodeURIComponent(decision.decision_id)}?morale=${decision.morale_after}&resources=${decision.resources_after}&condition=${decision.shipcondition_after}&user_email=${encodeURIComponent(effectiveEmail || '')}&stories_id=${storyId}&score_record_id=${decision.id}`)
  }

  if (loading || isUserLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          <Skeleton className="h-9 w-64 mb-3" />
          <Skeleton className="h-4 w-96 mb-8" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">Story Not Found</h1>
          <p className="text-sm text-muted-foreground mb-6">The story you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/')} size="sm">
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Image Header */}
      {story.storyImage && (
        <div className="relative w-full h-64 md:h-96 mb-8">
          <img 
            src={story.storyImage} 
            alt={story.story_name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
            <div className="container mx-auto max-w-7xl">
              {story.schoolYear && (
                <Badge variant="secondary" className="text-xs mb-3 bg-white/20 text-white border-white/30">
                  {story.schoolYear} - {story.schoolTerm}
                </Badge>
              )}
              <h1 className="text-4xl md:text-5xl font-bold mb-3">
                {story.story_name}
              </h1>
              <div className="text-lg opacity-90 max-w-3xl">
                <MarkdownContent content={story.story_description} className="prose-invert" />
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header - shown when no hero image */}
        {!story.storyImage && (
          <div className="mb-8">
            {story.schoolYear && (
              <Badge variant="secondary" className="text-xs mb-3">
                {story.schoolYear} - {story.schoolTerm}
              </Badge>
            )}
            <h1 className="text-3xl font-bold tracking-tight mb-3">
              {story.story_name}
            </h1>
            
            <div className="text-sm text-muted-foreground max-w-3xl">
              <MarkdownContent content={story.story_description} />
            </div>
          </div>
        )}

        {/* Crew Information */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Crew</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-5 pb-5">
                <div className="text-xs text-muted-foreground mb-1.5">Team Name</div>
                <div className="text-lg font-semibold">
                  {userSettings.vessel_name || "No team name assigned"}
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-5 pb-5">
                <div className="text-xs text-muted-foreground mb-1.5">Crew Name</div>
                <div className="text-lg font-semibold">
                  {userSettings.crew_name || "No crew assigned"}
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-5 pb-5">
                <div className="text-xs text-muted-foreground mb-1.5">Crew Leader</div>
                <div className="text-lg font-semibold">
                  {userSettings.crew_leader_name || "No leader assigned"}
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-5 pb-5">
                <div className="text-xs text-muted-foreground mb-1.5">Crew Captain</div>
                <div className="text-lg font-semibold">
                  {userSettings.crew_captain_name || "No captain assigned"}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Decision Journey */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Decision History</h2>
          {userMadeDecisions.length === 0 ? (
            <Card className="border shadow-sm">
              <CardContent className="text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-base font-semibold mb-1">No decisions yet</h3>
                <p className="text-sm text-muted-foreground">Start your survival journey!</p>
              </CardContent>
            </Card>
          ) : (
            <ItemGroup>
              {userMadeDecisions
                .sort((a, b) => (a.story_sequence?.decision_number ?? a.decision_number ?? 0) - (b.story_sequence?.decision_number ?? b.decision_number ?? 0))
                .map((decision, index) => (
                  <Item
                    key={decision.id}
                    className={`cursor-pointer ${
                      decision.complete ? 'bg-green-50/50 dark:bg-green-950/10 border-l-4 border-l-green-500' : ''
                    }`}
                    onClick={() => handleDecisionClick(decision)}
                  >
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge 
                        variant={decision.complete ? "default" : "secondary"} 
                        className={`text-xs font-semibold ${decision.complete ? 'bg-green-600 hover:bg-green-700' : ''}`}
                      >
                        {decision.story_sequence?.decision_number ?? decision.decision_number ?? index + 1}
                      </Badge>
                    </div>
                    
                    <ItemContent>
                      <ItemTitle>
                        {decision.story_details?.decision_title || decision.decision_id}
                      </ItemTitle>
                      {decision.story_details?.story_summary && (
                        <ItemDescription className="line-clamp-2">
                          {decision.story_details.story_summary}
                        </ItemDescription>
                      )}
                    </ItemContent>
                    
                    <ItemActions>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </ItemActions>
                  </Item>
                ))}
            </ItemGroup>
          )}
        </div>

      </div>
    </div>
  )
}
