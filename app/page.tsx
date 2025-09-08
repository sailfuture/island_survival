"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronRight, BookOpen, Ship, Users, Crown, Star } from "lucide-react"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useCurrentUser } from "@/hooks/use-current-user"

interface UserDecision {
  id: number
  created_at: number
  decision_id: string
  decision_description?: string
  email: string
  previous_decision: string
  morale_before: number
  condition_before: number
  resources_before: number
  morale_after: number
  shipcondition_after: number
  resources_after: number
  island_survival_stories_id?: number
  complete: boolean
  current?: number
  island_survival_sequence_id?: number
  story_sequence?: {
    id: number
    created_at: number
    current_story_id: number
    decision_id: string
    choice_type: string
    decision_number: number
    previous_stories: number[]
    next_stories: number[]
  }
  _island_survival_stories_singleitem?: {
    id: number
    created_at: number
    decision_id: string
    next: number[]
    decision_title: string
    decision_description: string
    story: string
    condition: number
    morale: number
    resources: number
    from: number[]
    decision_number: number
    choice: string
    condition_description: string
    morale_description: string
    resources_description: string
    reflective_prompt_1: string
    reflective_prompt_2: string
    reflective_prompt_3: string
    reflective_prompt_4: string
  }
}

interface LeaderboardEntry {
  id: number
  rank: number
  email: string
  crew_name?: string
  crewmoral: number
  resources: number
  shipcondition: number
  decision_name: string
  created_at: number
  total_score: number
}

interface SpacePirateNarrative {
  id: number
  created_at: number
  decision_id: string
  decision_title: string
  decision_description: string
  decision_text?: string // Keep for backward compatibility
  story?: string
  condition: number
  morale: number
  resources: number
  decision_number: number
  choice: string
  condition_description: string
  morale_description: string
  resources_description: string
  reflective_prompt_1: string
  reflective_prompt_2: string
  reflective_prompt_3: string
  reflective_prompt_4: string
  next?: number[]
  from?: number[]
}

interface UserSettings {
  vessel_name: string
  crew_name: string
  crew_leader_name: string
  crew_captain_name: string
}

const XANO_BASE_URL = "https://xsc3-mvx7-r86m.n7e.xano.io/api:7l5S8ZC7"

// Helper functions for stat calculations - prevent floating point precision errors
const roundToTwo = (num: number): number => {
  // Handle very small values that should be treated as 0
  if (Math.abs(num) < 0.005) return 0
  return Math.round(num * 100) / 100
}
const clampMoraleCondition = (value: number): number => {
  const clamped = Math.max(0, Math.min(1, value))
  return roundToTwo(clamped)
}
const clampResources = (value: number): number => Math.max(0, Math.round(value))

export default function HomePage() {
  const [userMadeDecisions, setUserMadeDecisions] = useState<UserDecision[]>([])
  const [availableDecisions, setAvailableDecisions] = useState<SpacePirateNarrative[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userSettings, setUserSettings] = useState<UserSettings>({
    vessel_name: "",
    crew_name: "",
    crew_leader_name: "",
    crew_captain_name: ""
  })
  const [loading, setLoading] = useState(true)
  const [isStartingOver, setIsStartingOver] = useState(false)
  const { email: userEmail, isLoading: isUserLoading } = useCurrentUser()
  
  // Use the email from the auth hook directly
  const effectiveEmail = userEmail
  
  // Check if user is authenticated
  const isAuthenticated = !!userEmail

  const [currentPlayerStatus, setCurrentPlayerStatus] = useState({
    condition: 0,
    morale: 0,
    resources: 0
  })
  const [hasLoadedStatus, setHasLoadedStatus] = useState(false)

  const router = useRouter()

  // Add debugging for authentication
  useEffect(() => {
    console.log('Authentication Debug:', {
      userEmail,
      effectiveEmail,
      isUserLoading,
      isAuthenticated: !!userEmail
    })
  }, [userEmail, isUserLoading, effectiveEmail])

  useEffect(() => {
    // Only fetch data when we have an email and not loading
    if (effectiveEmail && !isUserLoading) {
      console.log('Fetching data for user:', effectiveEmail)
      
      // Call create_new_story endpoint
      const callCreateNewStory = async () => {
        try {
          console.log('Calling create_new_story for user:', effectiveEmail)
          
          const response = await fetch(`${XANO_BASE_URL}/create_new_story?user_email=${encodeURIComponent(effectiveEmail)}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          })
          
          if (response.ok) {
            const result = await response.json()
            console.log('create_new_story response:', result)
          } else {
            console.error('create_new_story failed:', response.status, response.statusText)
          }
        } catch (error) {
          console.error('Error calling create_new_story:', error)
        }
      }
      
      // Call create_new_story first
      callCreateNewStory()
      
      // Then fetch user settings
      fetchData(effectiveEmail)
      
      // No automatic refresh - only manual refresh when needed
    }
  }, [effectiveEmail, isUserLoading])

  // Remove window focus refresh to prevent constant API calls

  async function fetchData(email: string) {
    try {
      console.log('Starting fetchData for email:', email)
      
      // Fetch user's decisions using user_all_scores endpoint
      try {
        const scoresResponse = await fetch(`${XANO_BASE_URL}/user_all_scores?user_email=${encodeURIComponent(email)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
        
        if (scoresResponse.ok) {
          const scoresData = await scoresResponse.json()
          console.log('user_all_scores response:', scoresData)
          
          // Handle the response structure with score_records array
          if (scoresData && scoresData.score_records && Array.isArray(scoresData.score_records)) {
            // Merge decision_title from current_story into score records
            let enrichedScoreRecords = scoresData.score_records
            
            if (scoresData.current_story && scoresData.current_story.decision_title) {
              console.log('Current story:', scoresData.current_story)
              
              // Add decision_title to score records that match the current story
              enrichedScoreRecords = scoresData.score_records.map(record => ({
                ...record,
                decision_title: record.current_story === scoresData.current_story.id 
                  ? scoresData.current_story.decision_title 
                  : record.decision_title
              }))
            }
            
            setUserMadeDecisions(enrichedScoreRecords)
            console.log(`Found ${enrichedScoreRecords.length} decisions for user:`, email)
          } else if (Array.isArray(scoresData)) {
            // Fallback if API returns array directly
            setUserMadeDecisions(scoresData)
            console.log(`Found ${scoresData.length} decisions for user:`, email)
          } else {
            console.log('user_all_scores returned unexpected format:', scoresData)
            setUserMadeDecisions([])
          }
        } else {
          console.error('user_all_scores failed:', scoresResponse.status, scoresResponse.statusText)
          
          // Try to get error details
          try {
            const errorText = await scoresResponse.text()
            console.error('Error response body:', errorText)
          } catch (e) {
            console.error('Could not read error response')
          }
          
          setUserMadeDecisions([])
        }
      } catch (error) {
        console.error('Error fetching user_all_scores:', error)
        setUserMadeDecisions([])
      }
      
      setAvailableDecisions([])
      
      // Fetch user settings
      try {
        const settingsResponse = await fetch(`${XANO_BASE_URL}/island_survival_settings`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
        if (settingsResponse.ok) {
          const allSettingsData = await settingsResponse.json()
          console.log('All settings fetched on homepage:', allSettingsData)
          
          // Find all settings for the current user
          const userSettingsArray = Array.isArray(allSettingsData)
            ? allSettingsData.filter((setting: any) => setting.email === email)
            : allSettingsData.email === email ? [allSettingsData] : []

          if (userSettingsArray.length > 0) {
            // Get the most recent entry (highest created_at)
            const latestUserSettings = userSettingsArray.reduce((latest: any, current: any) => {
              return current.created_at > latest.created_at ? current : latest
            })
            
            console.log('Using latest user settings on homepage:', latestUserSettings)
            setUserSettings({
              vessel_name: latestUserSettings.vessel_name || "",
              crew_name: latestUserSettings.crew_name || "",
              crew_leader_name: latestUserSettings.crew_leader_name || "",
              crew_captain_name: latestUserSettings.crew_captain_name || ""
            })
          } else {
            console.log('No user settings found, creating default settings for:', email)
            // Auto-create settings for new users
            const defaultSettings = {
              email: email,
              vessel_name: "Island Survivors",
              crew_name: "",
              crew_leader_name: "",
              crew_captain_name: ""
            }
            
            try {
              const createResponse = await fetch(`${XANO_BASE_URL}/island_survival_settings`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(defaultSettings),
              })
              
              if (createResponse.ok) {
                const createdSettings = await createResponse.json()
                console.log('Default settings created:', createdSettings)
                setUserSettings({
                  vessel_name: createdSettings.vessel_name || "Island Survivors",
                  crew_name: createdSettings.crew_name || "",
                  crew_leader_name: createdSettings.crew_leader_name || "",
                  crew_captain_name: createdSettings.crew_captain_name || ""
                })
                toast.success("Welcome! Default crew settings created. You can update them anytime.")
              } else {
                console.error('Failed to create settings - Status:', createResponse.status, await createResponse.text())
              }
            } catch (createError) {
              console.error("Failed to create default settings:", createError)
            }
          }

          // Fetch leaderboard data from API
          try {
            const leaderboardResponse = await fetch(`${XANO_BASE_URL}/leaderboard_values?user_email=${encodeURIComponent(email)}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              }
            })
            
            if (leaderboardResponse.ok) {
              const leaderboardData = await leaderboardResponse.json()
              console.log('leaderboard_values response:', leaderboardData)
              
              if (leaderboardData && leaderboardData.leaderboard_standings && Array.isArray(leaderboardData.leaderboard_standings)) {
                // Log the first entry to see the data structure
                if (leaderboardData.leaderboard_standings.length > 0) {
                  console.log('First leaderboard entry structure:', leaderboardData.leaderboard_standings[0])
                }
                
                // Process the new leaderboard structure
                const processedLeaderboard = leaderboardData.leaderboard_standings.map((entry: any, index: number) => {
                  // Calculate total score based on the three stats
                  const morale = (entry.morale_after || 0) * 100
                  const resources = entry.resources_after || 0
                  const condition = (entry.shipcondition_after || 0) * 100
                  const totalScore = Math.round((morale + condition + (resources * 1.5)) / 3) // Weight resources slightly more
                  
                  return {
                    id: entry[1]?.id || index,
                    rank: index + 1,
                    email: entry.email,
                    crew_name: entry[1]?.crew_name || '',
                    decision_title: entry[0]?.decision_title || 'Unknown Decision',
                    decision_id: entry[0]?.decision_id || '',
                    morale_after: entry.morale_after || 0,
                    resources_after: entry.resources_after || 0,
                    shipcondition_after: entry.shipcondition_after || 0,
                    current_story: entry.current_story || 0,
                    total_score: totalScore
                  }
                })
                
                // Sort by total_score and update ranks
                const sortedLeaderboard = processedLeaderboard
                  .sort((a, b) => b.total_score - a.total_score)
                  .map((entry, index) => ({ ...entry, rank: index + 1 }))
                
                setLeaderboard(sortedLeaderboard)
                console.log(`Leaderboard has ${sortedLeaderboard.length} entries`)
              } else if (Array.isArray(leaderboardData)) {
                // Fallback for old format
                const sortedLeaderboard = leaderboardData
                  .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
                  .map((entry, index) => ({ ...entry, rank: index + 1 }))
                
                setLeaderboard(sortedLeaderboard)
                console.log(`Leaderboard has ${sortedLeaderboard.length} entries`)
              } else {
                console.log('leaderboard_values returned unexpected format:', leaderboardData)
                setLeaderboard([])
              }
            } else {
              console.error('leaderboard_values failed:', leaderboardResponse.status, leaderboardResponse.statusText)
              
              // Try to get error details
              try {
                const errorText = await leaderboardResponse.text()
                console.error('Leaderboard error response:', errorText)
              } catch (e) {
                console.error('Could not read leaderboard error response')
              }
              
              setLeaderboard([])
            }
          } catch (error) {
            console.error('Error fetching leaderboard_values:', error)
            setLeaderboard([])
          }
        }
      } catch (error) {
        console.error("Failed to fetch user settings:", error)
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Separate useEffect to update player status when userMadeDecisions changes
  useEffect(() => {
    if (userMadeDecisions.length > 0) {
      console.log('🏠 All user decisions:', userMadeDecisions.map(d => ({ id: d.id, complete: d.complete, decision_id: d.decision_id })))
      
      // Find the latest incomplete record - this represents the user's current location/status
      const incompleteDecisions = userMadeDecisions.filter(d => !d.complete)
      console.log('🏠 Incomplete decisions found:', incompleteDecisions.length)
      
      if (incompleteDecisions.length > 0) {
        // Use the latest incomplete decision's values (where the user currently is)
        const latestIncompleteDecision = incompleteDecisions.sort((a, b) => b.created_at - a.created_at)[0]
        
        console.log('🏠 COMMAND CENTER: Using latest INCOMPLETE decision for current status:', {
          id: latestIncompleteDecision.id,
          complete: latestIncompleteDecision.complete,
          raw_condition: latestIncompleteDecision.shipcondition_after,
          raw_morale: latestIncompleteDecision.morale_after,
          raw_resources: latestIncompleteDecision.resources_after
        })
        
        // Use the raw database values directly from the sequence API
        console.log('🏠 COMMAND CENTER: Setting status from sequence API values (no clamping)')
        setCurrentPlayerStatus({
          condition: latestIncompleteDecision.shipcondition_after || 0,
          morale: latestIncompleteDecision.morale_after || 0,
          resources: latestIncompleteDecision.resources_after || 0,
        })
        setHasLoadedStatus(true)
        
        console.log('🏠 COMMAND CENTER: Final status set to:', {
          condition: latestIncompleteDecision.shipcondition_after || 0,
          morale: latestIncompleteDecision.morale_after || 0,
          resources: latestIncompleteDecision.resources_after || 0,
        })
      } else {
        // All decisions are complete, use the latest completed decision's values
        const latestDecision = userMadeDecisions.sort((a, b) => b.created_at - a.created_at)[0]
        
        console.log('🏠 COMMAND CENTER: All decisions complete, using latest completed decision for status:', {
          id: latestDecision.id,
          complete: latestDecision.complete,
          raw_condition: latestDecision.shipcondition_after,
          raw_morale: latestDecision.morale_after,
          raw_resources: latestDecision.resources_after
        })
        
        // Use raw database values directly - NO FALLBACKS OR CLAMPING
        console.log('🏠 COMMAND CENTER: Setting status to RAW database values from completed decision')
        setCurrentPlayerStatus({
          condition: latestDecision.shipcondition_after || 0,
          morale: latestDecision.morale_after || 0,
          resources: latestDecision.resources_after || 0,
        })
      }
    } else {
      // No decisions yet - keep status at 0 until user makes first decision
      setCurrentPlayerStatus({
        condition: 0,
        morale: 0,
        resources: 0,
      })
      setHasLoadedStatus(true)
    }
  }, [userMadeDecisions])

  const getStatusColor = (value: number) => {
    // Convert decimal to percentage if needed (Xano API uses 0.0-1.0 format)
    const percentage = value <= 1 ? value * 100 : value
    if (percentage >= 70) return "text-green-600"
    if (percentage >= 40) return "text-yellow-600"
    return "text-red-600"
  }

  const formatPercentage = (value: number) => {
    // Convert decimal to percentage if needed (Xano API uses 0.0-1.0 format)
    const percentage = value <= 1 ? value * 100 : value
    return Math.round(percentage)
  }

  // Function to check if game is over
  const isGameOver = () => {
    return currentPlayerStatus.morale <= 0 || 
           currentPlayerStatus.resources <= 0 || 
           currentPlayerStatus.condition <= 0
  }

  const handleStartOver = async () => {
    if (!effectiveEmail) {
      toast.error("Please log in to start over")
      return
    }
    
    setIsStartingOver(true)
    try {
      // No API calls - just reset local state
      console.log('Start over clicked - resetting local state')
      
      toast.success("Starting fresh adventure!")
      
      // Reset local state
      setUserMadeDecisions([])
      setCurrentPlayerStatus({
        morale: 0.8,
        resources: 65,
        condition: 0.8
      })
      // Refresh data
      await fetchData(effectiveEmail)
      router.push("/")
    } catch (error) {
      console.error('Error starting over:', error)
      toast.error('Failed to reset journey. Please try again.')
    } finally {
      setIsStartingOver(false)
    }
  }

  // Development-only function to fix precision errors in existing data
  const fixPrecisionErrors = async () => {
    if (process.env.NODE_ENV !== 'development') return
    
    console.log('Starting precision error cleanup...')
    const updates = []
    
    for (const decision of userMadeDecisions) {
      const cleanMorale = clampMoraleCondition(decision.morale_after)
      const cleanCondition = clampMoraleCondition(decision.shipcondition_after)
      const cleanResources = clampResources(decision.resources_after)
      
      if (cleanMorale !== decision.morale_after || 
          cleanCondition !== decision.shipcondition_after || 
          cleanResources !== decision.resources_after) {
        
        updates.push({
          id: decision.id,
          original: { 
            morale: decision.morale_after, 
            condition: decision.shipcondition_after, 
            resources: decision.resources_after 
          },
          cleaned: { morale: cleanMorale, condition: cleanCondition, resources: cleanResources }
        })
      }
    }
    
    console.log(`Found ${updates.length} records with precision errors:`, updates)
    
    if (updates.length > 0) {
      const confirmFix = confirm(`Found ${updates.length} records with precision errors. Fix them?`)
      if (confirmFix) {
        // Here you could implement the actual database updates
        console.log('Would update these records:', updates)
        toast.success(`Identified ${updates.length} records for cleanup`)
      }
    } else {
      toast.success('No precision errors found!')
    }
  }

  if (loading || isUserLoading || !effectiveEmail) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <Skeleton className="h-64 mb-8" />
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Command Center</h1>
          <p className="text-muted-foreground">Monitor your survival tribe's status and navigate your adventure.</p>
        </div>

        {/* Survival Tribe Information Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Survival Tribe Name
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {userSettings.vessel_name || "No tribe name assigned"}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-mono">Your survival tribe designation</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Crew Name
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {userSettings.crew_name || "No crew assigned"}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-mono">Your crew designation</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Crew Leader
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {userSettings.crew_leader_name || "No leader assigned"}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-mono">Your Tribe Chief</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Crew Captain
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {userSettings.crew_captain_name || "No captain assigned"}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-mono">Your Tribe Leader</p>
            </CardContent>
          </Card>
        </div>

        {/* Decision Journey */}
        <Card className="w-full mb-8">
          <CardHeader>
            <CardTitle>Decision Journey</CardTitle>
            <CardDescription>Your story progression - make decisions to unlock the next chapter.</CardDescription>
          </CardHeader>
          <CardContent>
            {userMadeDecisions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No decisions yet</p>
                <p className="text-sm mt-2">Start your journey to see your progress here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userMadeDecisions
                  .sort((a, b) => (a.story_sequence?.decision_number ?? a.current_sequence ?? 0) - (b.story_sequence?.decision_number ?? b.current_sequence ?? 0))
                  .map((decision, index) => {
                  const isCompleted = decision.complete
                  const isCurrentDecision = !isCompleted && index === userMadeDecisions.length - 1
                  
                  return (
                    <div
                      key={decision.id}
                      className={`border rounded-lg transition-all duration-200 ${
                        isCompleted 
                          ? "border-green-500 bg-green-50 dark:bg-green-950/20" 
                          : isCurrentDecision
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-md"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-card"
                      }`}
                    >
                      <div
                        className={`p-4 transition-colors cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/50`}
                        onClick={() => {
                          router.push(`/decision/${decision.current_story}?morale=${decision.morale_after}&resources=${decision.resources_after}&condition=${decision.shipcondition_after}&user_email=${encodeURIComponent(effectiveEmail)}`)
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center space-x-3">
                              <Badge 
                                variant={isCompleted ? "secondary" : isCurrentDecision ? "default" : "outline"} 
                                className="font-mono text-xs"
                              >
                                Decision {decision.story_sequence?.decision_number ?? decision.current_sequence ?? 1}
                              </Badge>
                              
                              <span className="font-semibold text-foreground">
                                {decision.story_details?.decision_title || decision.decision_title || decision.decision_id || 'Decision'}
                              </span>
                              
                              {isCompleted && (
                                <Badge variant="secondary" className="font-mono text-xs text-green-600">
                                  Completed
                                </Badge>
                              )}
                              
                              {isCurrentDecision && (
                                <Badge variant="default" className="font-mono text-xs">
                                  ➤ Continue Story
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground">
                              Click to {isCompleted ? 'review' : 'continue'} this decision
                            </p>
                          </div>
                          
                          <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Status Cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Health</CardTitle>
            </CardHeader>
            <CardContent>
              {!hasLoadedStatus || currentPlayerStatus.condition === 0 || !currentPlayerStatus.condition ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>{!hasLoadedStatus ? "Loading..." : "No data"}</p>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold mb-2">
                    <span className={`font-bold ${getStatusColor(currentPlayerStatus.condition)}`}>
                      {formatPercentage(currentPlayerStatus.condition)}%
                    </span>
                  </div>
                  <Progress value={formatPercentage(currentPlayerStatus.condition)} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2 font-mono">Physical condition of the crew</p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Morale</CardTitle>
            </CardHeader>
            <CardContent>
              {!hasLoadedStatus || currentPlayerStatus.morale === 0 || !currentPlayerStatus.morale ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>{!hasLoadedStatus ? "Loading..." : "No data"}</p>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold mb-2">
                    <span className={`font-bold ${getStatusColor(currentPlayerStatus.morale)}`}>
                      {formatPercentage(currentPlayerStatus.morale)}%
                    </span>
                  </div>
                  <Progress value={formatPercentage(currentPlayerStatus.morale)} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2 font-mono">Team spirit and motivation</p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resources</CardTitle>
            </CardHeader>
            <CardContent>
              {!hasLoadedStatus || currentPlayerStatus.resources === 0 || !currentPlayerStatus.resources ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>{!hasLoadedStatus ? "Loading..." : "No data"}</p>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold mb-2">
                    <span className={getStatusColor(currentPlayerStatus.resources)}>{currentPlayerStatus.resources}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 font-mono">Food, water, and supplies</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Survival Leaderboard */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Survival Leaderboard</CardTitle>
            <CardDescription>Top survivors on the island, ranked by overall status.</CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-lg">No leaderboard data available</p>
                <p className="text-sm mt-2">Complete decisions to appear on the leaderboard</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Rank</TableHead>
                    <TableHead>Crew Name</TableHead>
                    <TableHead>Last Decision</TableHead>
                    <TableHead className="text-right">Health</TableHead>
                    <TableHead className="text-right">Morale</TableHead>
                    <TableHead className="text-right">Resources</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.slice(0, 10).map((entry, index) => (
                    <TableRow key={entry.id || `leaderboard-${index}-${entry.email}`} className={entry.email === effectiveEmail ? "bg-blue-50 dark:bg-blue-950/20" : ""}>
                      <TableCell className="font-mono">{entry.rank}</TableCell>
                      <TableCell className="font-medium">
                        {entry.email === effectiveEmail ? "You" : (entry.crew_name || entry.email?.split("@")[0] || "Unknown")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.decision_title || entry.decision_name || entry.decision_id || "No decision"}
                      </TableCell>
                      <TableCell className={`text-right font-mono ${getStatusColor(entry.shipcondition_after || entry.condition_after || entry.shipcondition || 0)}`}>
                        {formatPercentage(entry.shipcondition_after || entry.condition_after || entry.shipcondition || 0)}%
                      </TableCell>
                      <TableCell className={`text-right font-mono ${getStatusColor(entry.morale_after || entry.crewmoral || 0)}`}>
                        {formatPercentage(entry.morale_after || entry.crewmoral || 0)}%
                      </TableCell>
                      <TableCell className={`text-right font-mono ${getStatusColor(entry.resources_after || entry.resources || 0)}`}>
                        {entry.resources_after || entry.resources || 0}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {Math.round(entry.total_score || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
