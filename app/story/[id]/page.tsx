"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ChevronRight, BookOpen, Star } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { useCurrentUser } from "@/hooks/use-current-user"
import { MarkdownContent } from "@/components/markdown-content"

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

interface LeaderboardEntry {
  id: number
  rank: number
  email: string
  crew_name?: string
  decision_title: string
  morale_after: number
  resources_after: number
  shipcondition_after: number
  total_score: number
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
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userSettings, setUserSettings] = useState<UserSettings>({
    email: effectiveEmail || "",
    vessel_name: "",
    crew_name: "",
    crew_leader_name: "",
    crew_captain_name: "",
    stories_id: storyId
  })
  const [loading, setLoading] = useState(true)
  const [currentPlayerStatus, setCurrentPlayerStatus] = useState({
    condition: 0,
    morale: 0,
    resources: 0
  })
  const [hasLoadedStatus, setHasLoadedStatus] = useState(false)
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
      setCurrentPlayerStatus({ condition: 0, morale: 0, resources: 0 })
      setHasLoadedStatus(false)
      setActiveDecisionId(null)
      setUserSettings({
        email: effectiveEmail || "",
        vessel_name: "",
        crew_name: "",
        crew_leader_name: "",
        crew_captain_name: "",
        stories_id: storyId
      })
      setLeaderboard([])
      
      console.log('Fetching data for story:', storyId, 'user:', effectiveEmail)

      // Fetch story details
      const storyResponse = await fetch(`${XANO_BASE_URL}/stories/${storyId}`)
      if (storyResponse.ok) {
        const storyData = await storyResponse.json()
        setStory(storyData)
        console.log('Story loaded:', storyData)
      }

      if (effectiveEmail) {
        // Create new story instance for user if needed
        await fetch(`${XANO_BASE_URL}/create_new_story?user_email=${encodeURIComponent(effectiveEmail)}&stories_id=${storyId}`)

        // Fetch user's decisions for this story
        let scoresData: any = null
        const scoresUrl = `${XANO_BASE_URL}/user_all_scores?user_email=${encodeURIComponent(effectiveEmail)}&stories_id=${storyId}`
        console.log('Fetching user scores from:', scoresUrl)
        const scoresResponse = await fetch(scoresUrl)
        if (scoresResponse.ok) {
          scoresData = await scoresResponse.json()
          console.log('User scores response for', effectiveEmail, 'story', storyId, ':', scoresData)
          
          if (scoresData && scoresData.score_records && Array.isArray(scoresData.score_records)) {
            // Filter score_records to only show records for current user and story
            const filteredScores = scoresData.score_records.filter((record: any) => 
              record.email === effectiveEmail && record.stories_id === storyId
            )
            console.log('Filtered score records for current user:', filteredScores)
            setUserMadeDecisions(filteredScores)
            
            // Set current player status from latest incomplete decision (use filtered scores)
            const incompleteDecisions = filteredScores.filter((d: UserDecision) => !d.complete)
            if (incompleteDecisions.length > 0) {
              const latestDecision = incompleteDecisions.sort((a: UserDecision, b: UserDecision) => b.created_at - a.created_at)[0]
              setCurrentPlayerStatus({
                condition: latestDecision.shipcondition_after,
                morale: latestDecision.morale_after,
                resources: latestDecision.resources_after
              })
            }
            setHasLoadedStatus(true)
            
            // Get active decision_id from score_records (use filtered scores)
            if (filteredScores.length > 0) {
              const latestRecord = filteredScores[filteredScores.length - 1]
              setActiveDecisionId(latestRecord.decision_id)
            }
          }
        }

        // Fetch user settings from island_survival_settings endpoint
        try {
          const settingsUrl = `${XANO_BASE_URL}/island_survival_settings?stories_id=${storyId}&user_email=${encodeURIComponent(effectiveEmail)}`
          console.log('Fetching settings from:', settingsUrl)
          const settingsResponse = await fetch(settingsUrl)
          if (settingsResponse.ok) {
            const settingsData = await settingsResponse.json()
            console.log('Settings response for', effectiveEmail, 'story', storyId, ':', settingsData)
            
            // Log what we're filtering
            if (Array.isArray(settingsData) && settingsData.length > 0) {
              console.log('Checking filter criteria: Looking for email=', effectiveEmail, 'stories_id=', storyId, '(type:', typeof storyId, ')')
              console.log('Settings details:', settingsData.map((s: any) => ({
                id: s.id,
                email: s.email,
                stories_id: s.stories_id,
                stories_id_type: typeof s.stories_id,
                email_match: s.email === effectiveEmail,
                stories_match: s.stories_id === storyId,
                stories_match_loose: s.stories_id == storyId, // Try loose equality
                both_match: s.email === effectiveEmail && s.stories_id === storyId
              })))
            }
            
            // Handle both array and single object responses
            // IMPORTANT: Filter by email client-side as extra safety measure
            const userSettingsArray = Array.isArray(settingsData) 
              ? settingsData.filter((s: any) => s.email === effectiveEmail && s.stories_id === storyId)
              : (settingsData.id && settingsData.email === effectiveEmail && settingsData.stories_id === storyId) ? [settingsData] : []
            
            console.log('Filtered settings for current user (email:', effectiveEmail, 'storyId:', storyId, '):', userSettingsArray)

            if (userSettingsArray.length > 0) {
              const latestSettings = userSettingsArray.reduce((latest: any, current: any) => {
                return (current.created_at || 0) > (latest.created_at || 0) ? current : latest
              })
              
              console.log('Using latest settings:', latestSettings)
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
          } else {
            console.warn('Settings endpoint returned error:', settingsResponse.status)
          }
        } catch (settingsError) {
          console.warn('Error fetching settings:', settingsError)
          // Continue without settings - page should still load
        }

        // Fetch leaderboard for this story
        try {
          const leaderboardResponse = await fetch(`${XANO_BASE_URL}/leaderboard_values?stories_id=${storyId}`)
          if (leaderboardResponse.ok) {
            const leaderboardData = await leaderboardResponse.json()
            console.log('Leaderboard response:', leaderboardData)
            
            if (leaderboardData && leaderboardData.leaderboard_standings) {
              // Process leaderboard data (structure may vary)
              const processedLeaderboard = Array.isArray(leaderboardData.leaderboard_standings) 
                ? leaderboardData.leaderboard_standings.map((entry: any, index: number) => ({
                    id: entry.id || index,
                    rank: index + 1,
                    email: entry.email,
                    crew_name: entry.crew_name || '',
                    decision_title: entry.decision_title || 'Unknown Decision',
                    morale_after: entry.morale_after || 0,
                    resources_after: entry.resources_after || 0,
                    shipcondition_after: entry.shipcondition_after || 0,
                    total_score: Math.round(((entry.morale_after || 0) * 100 + (entry.shipcondition_after || 0) * 100 + (entry.resources_after || 0) * 1.5) / 3)
                  }))
                : []
              setLeaderboard(processedLeaderboard)
            }
          } else {
            console.warn('Leaderboard endpoint returned error:', leaderboardResponse.status)
            // Leaderboard is optional - don't fail the page load
          }
        } catch (leaderboardError) {
          console.warn('Error fetching leaderboard (optional feature):', leaderboardError)
          // Leaderboard is optional - continue without it
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
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
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
            <Card className="border-0 shadow-sm">
              <CardContent className="text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-base font-semibold mb-1">No decisions yet</h3>
                <p className="text-sm text-muted-foreground">Start your survival journey!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {userMadeDecisions
                .sort((a, b) => (a.story_sequence?.decision_number ?? a.decision_number ?? 0) - (b.story_sequence?.decision_number ?? b.decision_number ?? 0))
                .map((decision, index) => (
                  <Card 
                    key={decision.id}
                    className={`cursor-pointer transition-all hover:shadow-md border-0 shadow-sm ${
                      decision.complete ? 'bg-green-50/50 dark:bg-green-950/20' : ''
                    }`}
                    onClick={() => handleDecisionClick(decision)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center space-x-2">
                            <Badge variant={decision.complete ? "default" : "secondary"} className="text-xs">
                              Decision {decision.story_sequence?.decision_number ?? decision.decision_number ?? index + 1}
                            </Badge>
                            <h3 className="text-sm font-semibold">
                              {decision.story_details?.decision_title || decision.decision_id}
                            </h3>
                          </div>
                          {decision.story_details?.story_summary && (
                            <div className="text-xs text-muted-foreground">
                              <MarkdownContent content={decision.story_details.story_summary} />
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-3" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </div>

        {/* Current Status Cards */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Current Status</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-5 pb-6">
                {!hasLoadedStatus || currentPlayerStatus.condition === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <p className="text-sm">{!hasLoadedStatus ? "Loading..." : "No data"}</p>
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-muted-foreground mb-2">Health</div>
                    <div className="text-2xl font-bold mb-3">
                      {Math.round(currentPlayerStatus.condition * 100)}%
                    </div>
                    <Progress value={currentPlayerStatus.condition * 100} className="h-1.5 mb-2" />
                    <p className="text-xs text-muted-foreground">Physical condition of the crew</p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-5 pb-6">
                {!hasLoadedStatus || currentPlayerStatus.morale === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <p className="text-sm">{!hasLoadedStatus ? "Loading..." : "No data"}</p>
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-muted-foreground mb-2">Morale</div>
                    <div className="text-2xl font-bold mb-3">
                      {Math.round(currentPlayerStatus.morale * 100)}%
                    </div>
                    <Progress value={currentPlayerStatus.morale * 100} className="h-1.5 mb-2" />
                    <p className="text-xs text-muted-foreground">Team spirit and motivation</p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-5 pb-6">
                {!hasLoadedStatus || currentPlayerStatus.resources === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <p className="text-sm">{!hasLoadedStatus ? "Loading..." : "No data"}</p>
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-muted-foreground mb-2">Resources</div>
                    <div className="text-2xl font-bold mb-3">
                      {Math.round(currentPlayerStatus.resources)}
                    </div>
                    <Progress value={Math.min(currentPlayerStatus.resources, 150)} max={150} className="h-1.5 mb-2" />
                    <p className="text-xs text-muted-foreground">Food, water, and supplies</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Survival Leaderboard */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Survival Leaderboard</h2>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {leaderboard.length === 0 ? (
                <div className="text-center py-12">
                  <Star className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-base font-semibold mb-1">No leaderboard data</h3>
                  <p className="text-sm text-muted-foreground">Complete some decisions to see rankings!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px] text-xs">Rank</TableHead>
                      <TableHead className="text-xs">Crew Name</TableHead>
                      <TableHead className="text-xs">Last Decision</TableHead>
                      <TableHead className="text-right text-xs">Health</TableHead>
                      <TableHead className="text-right text-xs">Morale</TableHead>
                      <TableHead className="text-right text-xs">Resources</TableHead>
                      <TableHead className="text-right text-xs">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.slice(0, 10).map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm font-medium">#{entry.rank}</TableCell>
                        <TableCell className="text-sm">{entry.crew_name || entry.email}</TableCell>
                        <TableCell className="text-sm">{entry.decision_title}</TableCell>
                        <TableCell className="text-right text-sm">
                          {Math.round(entry.shipcondition_after * 100)}%
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {Math.round(entry.morale_after * 100)}%
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {Math.round(entry.resources_after)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold">{entry.total_score}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
