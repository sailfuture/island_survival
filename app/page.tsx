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
  decision_description: string
  email: string
  previous_decision: string
  morale_before: number
  condition_before: number
  resources_before: number
  morale_after: number
  shipcondition_after: number
  resources_after: number
  spacepiratenarratives_id: number
  complete: boolean
  _spacepiratenarratives_singleitem: {
    id: number
    created_at: number
    decision_id: string
    next: number[]
    decision_title: string
    decision_description: string
    decision_text: string
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
  decision_text: string
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

const XANO_BASE_URL = "https://xsc3-mvx7-r86m.n7e.xano.io/api:N0QpoI29"

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
    condition: 0.8, // 80%
    morale: 0.8,    // 80%
    resources: 65,  // 65 units
  })

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
      fetchData(effectiveEmail)
      
      // Set up periodic refresh for leaderboard data (every 30 seconds)
      const refreshInterval = setInterval(() => {
        fetchData(effectiveEmail)
      }, 30000)
      
      // Cleanup interval on unmount
      return () => clearInterval(refreshInterval)
    }
  }, [effectiveEmail, isUserLoading])

  // Refresh data when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      if (effectiveEmail && !isUserLoading) {
        fetchData(effectiveEmail)
      }
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [effectiveEmail, isUserLoading])

  async function fetchData(email: string) {
    try {
      console.log('Starting fetchData for email:', email)
      
      // Fetch user decisions from spacepirates endpoint
      const spacePiratesResponse = await fetch(`${XANO_BASE_URL}/spacepirates`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      const allDecisions: UserDecision[] = await spacePiratesResponse.json()
      console.log('Total decisions fetched:', allDecisions.length)
      
      // Filter decisions by the current user's email
      const userDecisions = allDecisions.filter(decision => decision.email === email)
      console.log('User decisions found:', userDecisions.length, 'for email:', email)
      setUserMadeDecisions(userDecisions)

      // Fetch space pirate narratives
      const narrativesResponse = await fetch(`${XANO_BASE_URL}/spacepiratenarratives`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      const narratives: SpacePirateNarrative[] = await narrativesResponse.json()
      console.log('All narratives fetched:', narratives.length)
      setAvailableDecisions(narratives)

      // Auto-initialize new users with settings and START decision
      if (userDecisions.length === 0) {
        console.log('New user detected, creating initial settings and START decision...')
        
        // Find the START decision in the narratives
        const startDecision = narratives.find(n => n.decision_id === "START" || n.decision_number === 0)
        
        if (startDecision) {
          try {
            // Create initial START decision record with complete: false
            const initialDecisionPayload = {
              decision_id: "START",
              email: email,
              previous_decision: "", // No previous decision for START
              morale_before: 0.8,
              condition_before: 0.8,
              resources_before: 65,
              morale_after: 0.8,
              shipcondition_after: 0.8,
              resources_after: 65,
              spacepiratenarratives_id: startDecision.id,
              complete: false // START is available, not complete initially
            }
            
            console.log('Creating initial START decision with payload:', initialDecisionPayload)
            
            const startDecisionResponse = await fetch(`${XANO_BASE_URL}/spacepirates`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(initialDecisionPayload),
            })
            
            if (startDecisionResponse.ok) {
              const createdStartDecision = await startDecisionResponse.json()
              console.log('Initial START decision created successfully:', createdStartDecision)
              
              // Add to local state
              setUserMadeDecisions([createdStartDecision])
              
              toast.success("Welcome! Your space adventure is ready to begin...")
            } else {
              console.error('Failed to create initial START decision - Status:', startDecisionResponse.status)
              const errorText = await startDecisionResponse.text()
              console.error('START decision error response:', errorText)
            }
          } catch (startDecisionError) {
            console.error('Error creating initial START decision:', startDecisionError)
          }
        }
        
        // Create initial settings for the new user
        try {
          const initialSettingsPayload = {
            email: email,
            vessel_name: "Set Ship Name",
            crew_name: "Set Crew Name",
            crew_leader_name: "Set Crew Leader Name",
            crew_captain_name: "Set Crew Captain Name"
          }
          
          console.log('Creating initial settings with payload:', initialSettingsPayload)
          
          const settingsResponse = await fetch(`${XANO_BASE_URL}/spacepiratesettings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(initialSettingsPayload),
          })
          
          if (settingsResponse.ok) {
            const createdSettings = await settingsResponse.json()
            console.log('Initial settings created successfully:', createdSettings)
            
            // Update local settings state
            setUserSettings({
              vessel_name: createdSettings.vessel_name || "Set Ship Name",
              crew_name: createdSettings.crew_name || "Set Crew Name",
              crew_leader_name: createdSettings.crew_leader_name || "Set Crew Leader Name",
              crew_captain_name: createdSettings.crew_captain_name || "Set Crew Captain Name"
            })
          } else {
            console.error('Failed to create initial settings - Status:', settingsResponse.status)
            const errorText = await settingsResponse.text()
            console.error('Settings error response:', errorText)
          }
        } catch (settingsError) {
          console.error('Error creating initial settings:', settingsError)
        }
      }
      
      // Fetch user settings
      try {
        const settingsResponse = await fetch(`${XANO_BASE_URL}/spacepiratesettings`, {
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
              vessel_name: "USS Explorer",
              crew_name: "",
              crew_leader_name: "",
              crew_captain_name: ""
            }
            
            try {
              const createResponse = await fetch(`${XANO_BASE_URL}/spacepiratesettings`, {
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
                  vessel_name: createdSettings.vessel_name || "USS Explorer",
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

          // Create leaderboard from all user decisions with real-time data
          const leaderboardData: LeaderboardEntry[] = []
          
          // Create a lookup map for user settings by email
          const settingsLookup: Record<string, any> = {}
          if (Array.isArray(allSettingsData)) {
            allSettingsData.forEach((setting: any) => {
              if (setting.email) {
                // Keep the most recent settings for each user
                if (!settingsLookup[setting.email] || setting.created_at > settingsLookup[setting.email].created_at) {
                  settingsLookup[setting.email] = setting
                }
              }
            })
          }
          
          console.log('Settings lookup created for', Object.keys(settingsLookup).length, 'users')
          
          // Group decisions by user email and get their latest decision
          const userGroups = allDecisions.reduce((groups, decision) => {
            if (!decision.email) return groups
            
            if (!groups[decision.email]) {
              groups[decision.email] = []
            }
            groups[decision.email].push(decision)
            return groups
          }, {} as Record<string, UserDecision[]>)

          console.log('Processing leaderboard for', Object.keys(userGroups).length, 'users')

          // Create leaderboard entries from user groups
          Object.entries(userGroups).forEach(([userEmail, decisions], index) => {
            if (decisions.length === 0) return
            
            // Use the latest decision's saved values directly (these are already the final calculated values)
            const latestDecision = decisions.sort((a, b) => b.created_at - a.created_at)[0]
            
            // Validate the decision data before using it
            if (!latestDecision || typeof latestDecision.morale_after === 'undefined' || 
                typeof latestDecision.shipcondition_after === 'undefined' || 
                typeof latestDecision.resources_after === 'undefined') {
              console.warn(`Invalid decision data for user ${userEmail}:`, latestDecision)
              return
            }
            
            // Use the final saved values from Xano (already calculated when decision was made)
            // Important: These values should NOT be recalculated
            // Apply rounding to clean up any floating point precision errors
            const finalMorale = clampMoraleCondition(latestDecision.morale_after)
            const finalCondition = clampMoraleCondition(latestDecision.shipcondition_after)
            const finalResources = clampResources(latestDecision.resources_after)
            
            // Convert to weighted percentages for scoring (each worth 33.33%)
            const moraleScore = (finalMorale * 100) * 0.3333
            const conditionScore = (finalCondition * 100) * 0.3333
            const resourcesScore = (finalResources / 100) * 100 * 0.3333  // Normalize resources to 0-100 scale then weight
            const totalScore = moraleScore + conditionScore + resourcesScore
            
            console.log(`User ${userEmail}: weighted scoring - morale=${moraleScore.toFixed(1)}, condition=${conditionScore.toFixed(1)}, resources=${resourcesScore.toFixed(1)}, total=${totalScore.toFixed(1)}`)
            
            // Debug: Log precision issues if found
            if (finalMorale !== latestDecision.morale_after || 
                finalCondition !== latestDecision.shipcondition_after || 
                finalResources !== latestDecision.resources_after) {
              console.warn(`Precision errors found for ${userEmail}:`, {
                original: { 
                  morale: latestDecision.morale_after, 
                  condition: latestDecision.shipcondition_after, 
                  resources: latestDecision.resources_after 
                },
                cleaned: { morale: finalMorale, condition: finalCondition, resources: finalResources }
              })
            }
            
            // Use the nested narrative data for the decision title
            let decisionTitle = "No recent activity"
            if (latestDecision._spacepiratenarratives_singleitem?.decision_title) {
              decisionTitle = latestDecision._spacepiratenarratives_singleitem.decision_title
            } else if (latestDecision.decision_description) {
              decisionTitle = latestDecision.decision_description
            } else {
              // Fallback to finding the corresponding narrative
              const correspondingNarrative = narratives.find(n => n.decision_id === latestDecision.decision_id)
              if (correspondingNarrative) {
                decisionTitle = correspondingNarrative.decision_title
              } else {
                decisionTitle = `Decision ${latestDecision.decision_id}`
              }
            }

            // Get the user's specific crew name from the settings lookup
            const userSpecificSettings = settingsLookup[userEmail]
            const userCrewName = userSpecificSettings?.crew_name || ""
            
            leaderboardData.push({
              id: index + 1,
              email: userEmail,
              crew_name: userCrewName,  // Use the specific user's crew name
              crewmoral: finalMorale,        // Use final saved values
              resources: finalResources,     // Use final saved values
              shipcondition: finalCondition, // Use final saved values
              decision_name: decisionTitle,
              created_at: latestDecision.created_at,
              rank: 1, // Will be set after sorting
              total_score: totalScore
            })
          })

          // Sort leaderboard by total score and assign ranks
          const sortedLeaderboard = leaderboardData
            .sort((a, b) => b.total_score - a.total_score)
            .map((entry, index) => ({ ...entry, rank: index + 1 }))

          console.log('Updated leaderboard with', sortedLeaderboard.length, 'entries')
          setLeaderboard(sortedLeaderboard)
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
      // Use the latest decision's saved values directly (these are already the final calculated values)
      const latestDecision = userMadeDecisions.sort((a, b) => b.created_at - a.created_at)[0]
      
      console.log('Using latest decision saved values:', {
        condition: latestDecision.shipcondition_after,
        morale: latestDecision.morale_after,
        resources: latestDecision.resources_after
      })
      
      // Validate the data before using it
      if (typeof latestDecision.shipcondition_after === 'number' && 
          typeof latestDecision.morale_after === 'number' && 
          typeof latestDecision.resources_after === 'number') {
        setCurrentPlayerStatus({
          condition: clampMoraleCondition(latestDecision.shipcondition_after),
          morale: clampMoraleCondition(latestDecision.morale_after),
          resources: clampResources(latestDecision.resources_after),
        })
      } else {
        console.warn('Invalid decision data, using defaults:', latestDecision)
        // Only use defaults if data is actually invalid
        setCurrentPlayerStatus({
          condition: 0.8, // 80%
          morale: 0.8,    // 80%
          resources: 65,  // 65 units
        })
      }
    } else {
      // Set initial status for new players
      setCurrentPlayerStatus({
        condition: 0.8, // 80%
        morale: 0.8,    // 80%
        resources: 65,  // 65 units
      })
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
      // Call the dedicated start over API endpoint if it exists, otherwise manually delete
      try {
        const startOverResponse = await fetch(`${XANO_BASE_URL}/spacepiratestartover`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: effectiveEmail
          })
        })
        
        if (startOverResponse.ok) {
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
          return
        }
      } catch (apiError) {
        console.log('Start over API not available, using manual deletion')
      }
      
      // Manual deletion fallback - get all user decisions and delete them
      const response = await fetch(`${XANO_BASE_URL}/spacepirates`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      
      if (response.ok) {
        const allDecisions = await response.json()
        const userDecisions = allDecisions.filter((d: any) => d.email === effectiveEmail)
        
        console.log(`Found ${userDecisions.length} decisions to delete for user: ${effectiveEmail}`)
        
        // Delete each user decision
        for (const decision of userDecisions) {
          try {
            const deleteResponse = await fetch(`${XANO_BASE_URL}/spacepirates/${decision.id}`, {
              method: 'DELETE',
            })
            
            if (deleteResponse.ok) {
              console.log(`Deleted decision ${decision.id}`)
            } else {
              console.error(`Failed to delete decision ${decision.id}:`, deleteResponse.status)
            }
          } catch (deleteError) {
            console.error(`Error deleting decision ${decision.id}:`, deleteError)
          }
        }
        
        toast.success("Journey reset successfully! Starting fresh adventure...")
        
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
      } else {
        throw new Error('Failed to fetch user decisions')
      }
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
          <p className="text-muted-foreground">Monitor your vessel's status and navigate your adventure.</p>
        </div>

        {/* Vessel Information Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Vessel Name
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {userSettings.vessel_name || "No vessel assigned"}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-mono">Your starship designation</p>
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
              <p className="text-xs text-muted-foreground mt-1 font-mono">Your commanding officer</p>
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
              <p className="text-xs text-muted-foreground mt-1 font-mono">Your ship captain</p>
            </CardContent>
          </Card>
        </div>

        {/* Decision Journey */}
        <Card className="w-full mb-8">
          <CardHeader>
            <CardTitle>Decision Journey</CardTitle>
            <CardDescription>Your story progression - make decisions to unlock the next chapter.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {(() => {
              console.log('=== SIMPLIFIED DECISION JOURNEY DEBUG ===')
              console.log('Current User:', effectiveEmail)
              console.log('User Made Decisions:', userMadeDecisions.length)
              console.log('Available Narratives:', availableDecisions.length)
              
              // Sort all narratives by decision_number for proper ordering
              const sortedNarratives = [...availableDecisions].sort((a, b) => a.decision_number - b.decision_number)
              
              // Create a function to check if a decision has been completed
              // A decision is completed if the user made a choice FROM that decision
              const isDecisionCompleted = (decisionId: string) => {
                return userMadeDecisions.some(userDecision => 
                  userDecision.previous_decision === decisionId && 
                  userDecision.complete === true
                )
              }
              
              console.log('User completed decision check:', 
                sortedNarratives.map(n => `${n.decision_id}: ${isDecisionCompleted(n.decision_id)}`))
              
              // Show only the linear path the user has taken
              const decisionsToShow: Array<SpacePirateNarrative & { 
                status: 'completed' | 'available' | 'locked',
                userDecision?: UserDecision 
              }> = []
              
              if (userMadeDecisions.length === 0) {
                // New user: Show only the starting decision (decision_number = 0 or lowest)
                const startDecision = sortedNarratives.find(n => n.decision_number === 0) || sortedNarratives[0]
                if (startDecision) {
                  decisionsToShow.push({
                    ...startDecision,
                    status: 'available'
                  })
                  console.log('New user - showing start decision:', startDecision.decision_title)
                }
              } else {
                // Existing user: Show their path including incomplete START decisions
                
                // 1. Show all completed decisions AND incomplete START decisions
                const userDecisionsByTime = [...userMadeDecisions].sort((a, b) => a.created_at - b.created_at)
                
                userDecisionsByTime.forEach(userDecision => {
                  const narrative = sortedNarratives.find(n => n.id === userDecision.spacepiratenarratives_id)
                  if (narrative) {
                    // Show as completed if complete: true, or as available if it's START with complete: false
                    const isStartIncomplete = userDecision.decision_id === "START" && !userDecision.complete
                    const status = isStartIncomplete ? 'available' : (userDecision.complete ? 'completed' : 'available')
                    
                    decisionsToShow.push({
                      ...narrative,
                      status: status,
                      userDecision: userDecision
                    })
                    
                    if (userDecision.complete) {
                      console.log('Added completed decision:', narrative.decision_title, 'completed on', new Date(userDecision.created_at).toLocaleDateString())
                    } else if (isStartIncomplete) {
                      console.log('Added incomplete START decision:', narrative.decision_title, 'available to complete')
                    }
                  }
                })
                
                // Also add decisions they came FROM (these should show as completed)
                const decisionsTheyMadeChoicesFrom = new Set<string>()
                userMadeDecisions.forEach(userDecision => {
                  if (userDecision.complete && userDecision.previous_decision) {
                    decisionsTheyMadeChoicesFrom.add(userDecision.previous_decision)
                  }
                })
                
                // Add any missing "FROM" decisions as completed
                decisionsTheyMadeChoicesFrom.forEach(decisionId => {
                  const fromDecision = sortedNarratives.find(n => n.decision_id === decisionId)
                  if (fromDecision && !decisionsToShow.find(d => d.id === fromDecision.id)) {
                    const relatedUserDecision = userMadeDecisions.find(ud => 
                      ud.previous_decision === decisionId && ud.complete
                    )
                    
                    decisionsToShow.push({
                      ...fromDecision,
                      status: 'completed',
                      userDecision: relatedUserDecision
                    })
                    
                    console.log('Added FROM decision as completed:', fromDecision.decision_title)
                  }
                })
                
                // Sort decisions to show by decision_number to maintain order
                decisionsToShow.sort((a, b) => a.decision_number - b.decision_number)
              }
              
              console.log('=== FINAL DECISIONS TO SHOW ===')
              decisionsToShow.forEach((decision, index) => {
                console.log(`${index + 1}. ${decision.decision_title} (${decision.status}) - ID: ${decision.id} - Decision #${decision.decision_number}`)
              })

              if (decisionsToShow.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No decisions available</p>
                    <p className="text-sm">Please refresh the page or contact support</p>
                    <div className="mt-4 text-xs bg-gray-100 dark:bg-gray-800 p-4 rounded">
                      <p><strong>Debug Info:</strong></p>
                      <p>User: {effectiveEmail}</p>
                      <p>User Decisions: {userMadeDecisions.length}</p>
                      <p>Available Narratives: {availableDecisions.length}</p>
                      <p>Completed Decisions: {
                        sortedNarratives.filter(n => isDecisionCompleted(n.decision_id)).map(n => n.decision_id).join(', ')
                      }</p>
                    </div>
                  </div>
                )
              }

              return (
                <div className="space-y-4">
                  {decisionsToShow.map((decisionData, index) => {
                    const { status, userDecision, ...decision } = decisionData
                    const isCompleted = status === 'completed'
                    const isAvailable = status === 'available'

                    return (
                      <div
                        key={userDecision ? `user-${userDecision.id}-${decision.id}` : `narrative-${decision.id}-${status}-${index}`}
                        className={`border rounded-lg transition-all duration-200 bg-white dark:bg-card ${
                          isCompleted 
                            ? "border-green-500 bg-gray-50 dark:bg-gray-800/50 opacity-90" 
                            : "border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        <div
                          className={`p-4 transition-colors ${
                            isAvailable || isCompleted ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" : "cursor-default"
                          }`}
                          onClick={() => {
                            if (isAvailable || isCompleted) {
                              router.push(`/decision/${decision.id}?morale=${currentPlayerStatus.morale}&resources=${currentPlayerStatus.resources}&condition=${currentPlayerStatus.condition}`)
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center space-x-3">
                                <Badge 
                                  variant={isCompleted ? "secondary" : isAvailable ? (decision.decision_number === 0 ? "outline" : "default") : "outline"} 
                                  className={`font-mono text-xs ${decision.decision_number === 0 ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : ''}`}
                                >
                                  {decision.decision_number === 0 ? 'START' : `Decision ${decision.decision_number}`}
                                </Badge>
                                
                                <span className="font-semibold text-foreground">
                                  {decision.decision_title}
                                </span>
                                
                                {isCompleted && userDecision && (
                                  <Badge variant="secondary" className="font-mono text-xs text-green-600">
                                    {new Date(userDecision.created_at).toLocaleDateString()}
                                  </Badge>
                                )}
                                
                                {isAvailable && !isCompleted && (
                                  <Badge variant="default" className="font-mono text-xs">
                                    {decision.decision_id?.includes('FINAL_') ? 'Final Outcome' : '➤ New Story Available'}
                                  </Badge>
                                )}
                              </div>
                              
                              <p className="text-sm text-muted-foreground">
                                {decision.decision_description || (decision.decision_text ? decision.decision_text.substring(0, 120) + "..." : "No description available")}
                              </p>
                            </div>
                            
                            {(isAvailable || isCompleted) && (
                              <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </CardContent>
        </Card>

        {/* Ship Status Cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ship Condition</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">
                <span className={`font-bold ${getStatusColor(currentPlayerStatus.condition)}`}>
                  {formatPercentage(currentPlayerStatus.condition)}%
                </span>
              </div>
              <Progress value={formatPercentage(currentPlayerStatus.condition)} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2 font-mono">Hull integrity and systems status</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Crew Morale</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">
                <span className={`font-bold ${getStatusColor(currentPlayerStatus.morale)}`}>
                  {formatPercentage(currentPlayerStatus.morale)}%
                </span>
              </div>
              <Progress value={formatPercentage(currentPlayerStatus.morale)} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2 font-mono">Team spirit and loyalty levels</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">
                <span className={getStatusColor(currentPlayerStatus.resources)}>{currentPlayerStatus.resources}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-mono">Fuel, supplies, and credits</p>
            </CardContent>
          </Card>
        </div>

        {/* Fleet Leaderboard */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Fleet Leaderboard</CardTitle>
            <CardDescription>Top commanders across the galaxy, ranked by overall status.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Rank</TableHead>
                  <TableHead>Crew Name</TableHead>
                  <TableHead>Last Known Action</TableHead>
                  <TableHead className="text-right">Morale</TableHead>
                  <TableHead className="text-right">Resources</TableHead>
                  <TableHead className="text-right">Condition</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.slice(0, 5).map((entry) => (
                  <TableRow key={entry.id} className={entry.email === effectiveEmail ? "bg-blue-50 dark:bg-blue-950/20" : "bg-white dark:bg-gray-950"}>
                    <TableCell className="font-mono">{entry.rank}</TableCell>
                    <TableCell className="font-medium">
                      {entry.email === effectiveEmail ? "You" : (entry.crew_name || entry.email.split("@")[0])}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">{entry.decision_name}</TableCell>
                    <TableCell className={`text-right font-mono ${getStatusColor(entry.crewmoral)}`}>
                      {formatPercentage(entry.crewmoral)}%
                    </TableCell>
                    <TableCell className={`text-right font-mono ${getStatusColor(entry.resources)}`}>
                      {entry.resources}
                    </TableCell>
                    <TableCell className={`text-right font-mono ${getStatusColor(entry.shipcondition)}`}>
                      {formatPercentage(entry.shipcondition)}%
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">{Math.round(entry.total_score)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
