"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Users, Wrench, Coins, Printer } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { DecisionConfirmationModal } from "@/components/decision-confirmation-modal"
import { useCurrentUser } from "@/hooks/use-current-user"

interface NextChoice {
  id: number
  decision_id: string
  decision_title: string
  decision_description: string
  decision_text: string
  condition: number
  morale: number
  resources: number
  decision_number: number
  choice: string
  condition_description?: string
  morale_description?: string
  resources_description?: string
  reflective_prompt_1?: string
  reflective_prompt_2?: string
  reflective_prompt_3?: string
  reflective_prompt_4?: string
}

interface DecisionDetail {
  id: number
  created_at: number
  decision_id: string
  decision_title: string
  decision_description: string
  decision_summary?: string
  decision_text: string
  condition: number
  morale: number
  resources: number
  decision_number: number
  choice?: string
  next: NextChoice[]
  from?: NextChoice[]
  condition_description: string
  morale_description: string
  resources_description: string
  reflective_prompt_1?: string
  reflective_prompt_2?: string
  reflective_prompt_3?: string
  reflective_prompt_4?: string
  hero_image?: string
}

interface PlayerStatus {
  morale: number
  resources: number
  condition: number
}

interface UserSettings {
  vessel_name: string
  crew_name: string
  crew_leader_name: string
  crew_captain_name: string
}

interface UserDecision {
  id: number
  created_at: number
  decision_id: string
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
  _spacepiratenarratives_singleitem?: NextChoice & {
    from?: number[]
  }
}

const XANO_BASE_URL = "https://xsc3-mvx7-r86m.n7e.xano.io/api:N0QpoI29"

// Helper functions for stat calculations
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

// Function to get hero image for each decision
const getHeroImageForDecision = (decisionData: DecisionDetail | null): string => {
  // Use the hero_image from the JSON data if available
  if (decisionData?.hero_image) {
    return decisionData.hero_image
  }
  
  // Fallback to default images if no hero_image is provided
  const decisionId = decisionData?.decision_id || ''
  const decisionNumber = decisionData?.decision_number || 0
  
  if (decisionId?.includes('START') || decisionNumber === 0) {
    return 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=1200&h=600&fit=crop&crop=center'
  }
  
  if (decisionId?.includes('FINAL_') || decisionId?.includes('ENDING') || decisionId?.includes('END')) {
    return 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1200&h=600&fit=crop&crop=center'
  }
  
  // Rotate through different space images based on decision number
  const spaceImages = [
    'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200&h=600&fit=crop&crop=center', // Earth from space
    'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=1200&h=600&fit=crop&crop=center', // Nebula
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=600&fit=crop&crop=center', // Deep space
    'https://images.unsplash.com/photo-1608178398319-48f814d0750c?w=1200&h=600&fit=crop&crop=center', // Starfield
    'https://images.unsplash.com/photo-1614728894747-a83421369634?w=1200&h=600&fit=crop&crop=center', // Galaxy
    'https://images.unsplash.com/photo-1517076849937-6b7bbb8e2b8e?w=1200&h=600&fit=crop&crop=center', // Planet surface
    'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1200&h=600&fit=crop&crop=center', // Space station view
    'https://images.unsplash.com/photo-1573588028698-f4759befb09a?w=1200&h=600&fit=crop&crop=center'  // Cosmic scene
  ]
  
  const imageIndex = decisionNumber % spaceImages.length
  return spaceImages[imageIndex]
}

// Enhanced markdown renderer component
const MarkdownContent = ({ content }: { content: string }) => {
  const toTitleCase = (str: string) => {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  const formatText = (text: string) => {
    return text
      // Handle ## headings (h2) with title case
      .replace(/^## (.+)$/gm, (match, title) => 
        `<h2 class="text-2xl font-bold mb-4 mt-8 text-foreground border-b border-gray-200 pb-2">${toTitleCase(title.trim())}</h2>`
      )
      // Handle # headings (h1) with title case
      .replace(/^# (.+)$/gm, (match, title) => 
        `<h1 class="text-3xl font-bold mb-6 mt-8 text-foreground">${toTitleCase(title.trim())}</h1>`
      )
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      // Italic text
      .replace(/\*(.*?)\*/g, '<em class="italic text-foreground">$1</em>')
      // Line breaks - double newlines become paragraph breaks
      .replace(/\n\n/g, '</p><p class="mb-4 leading-relaxed">')
      // Single newlines become line breaks
      .replace(/\n/g, '<br/>')
      // Basic quote formatting
      .replace(/^"(.*?)"$/gm, '<blockquote class="border-l-4 border-gray-300 pl-4 italic text-gray-700 dark:text-gray-300 my-4">"$1"</blockquote>')
  }

  // Check if the content starts with a heading
  const startsWithHeading = /^#/.test(content.trim())

  return (
    <div 
      className="prose prose-gray dark:prose-invert max-w-none leading-relaxed text-foreground"
      style={{ fontSize: '1.1rem', lineHeight: '1.7' }}
      dangerouslySetInnerHTML={{ 
        __html: startsWithHeading 
          ? formatText(content) 
          : `<p class="mb-4 leading-relaxed">${formatText(content)}</p>` 
      }}
    />
  )
}

export default function DecisionPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showNextDecisionDialog, setShowNextDecisionDialog] = useState(false)
  const [isLoadingNext, setIsLoadingNext] = useState(false)
  const [selectedNextDecision, setSelectedNextDecision] = useState<number | null>(null)
  const [decisionData, setDecisionData] = useState<DecisionDetail | null>(null)
  const [reflectivePrompts, setReflectivePrompts] = useState<string[]>([])
  const [userDecisionFromThisPage, setUserDecisionFromThisPage] = useState<UserDecision | null>(null)
  const [showDecisionModal, setShowDecisionModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isStartingOver, setIsStartingOver] = useState(false)
  const [userSettings, setUserSettings] = useState<UserSettings>({
    vessel_name: "",
    crew_name: "",
    crew_leader_name: "",
    crew_captain_name: "",
  })
  const { email: userEmail, isLoading: isUserLoading } = useCurrentUser()

  // Use the email from the auth hook directly
  const effectiveEmail = userEmail

  const decisionId = params.id as string
  
  // Parse query parameters for player stats
  const moraleParam = searchParams.get('morale')
  const resourcesParam = searchParams.get('resources')
  const conditionParam = searchParams.get('condition')
  
  // Use passed values or defaults
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>({
    morale: moraleParam ? parseFloat(moraleParam) : 0.5,
    resources: resourcesParam ? parseInt(resourcesParam) : 65,
    condition: conditionParam ? parseFloat(conditionParam) : 0.5
  })

  // Add debugging
  useEffect(() => {
    console.log('Decision Page Auth Debug:', {
      userEmail,
      isUserLoading,
      decisionId: params.id
    })
  }, [userEmail, isUserLoading, params.id])

  // Extract data fetching into a separate function
  const fetchDecisionData = async () => {
    try {
      console.log('fetchData called for decision page:', params.id, 'user:', effectiveEmail)
      
      // Fetch decision data
      const decisionResponse = await fetch(`${XANO_BASE_URL}/spacepiratenarratives/${params.id}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      const decision: DecisionDetail = await decisionResponse.json()
      console.log('Decision data fetched:', decision.decision_title)
      setDecisionData(decision)

      // Fetch all decisions by the user
      const userDecisionsResponse = await fetch(`${XANO_BASE_URL}/spacepirates`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      const allUserDecisions = await userDecisionsResponse.json()
      console.log('All user decisions fetched:', allUserDecisions.length)
      
      // Filter to only get decisions by current user
      const userDecisions = allUserDecisions.filter((d: any) => d.email === effectiveEmail)
      console.log('Filtered user decisions:', userDecisions.length, 'for email:', effectiveEmail)
      const sortedUserDecisions = userDecisions.sort((a: any, b: any) => a.created_at - b.created_at)
      
      // Find if the user has made a choice FROM this page
      // Look for ANY decision that was made FROM this page (where previous_decision matches current page's decision_id)
      // This represents the choice that was made, regardless of complete status
      let choiceMadeFromThisPage = null
      
      choiceMadeFromThisPage = userDecisions.find((userDecision: any) => 
        userDecision.previous_decision === decision.decision_id
      )
      
      console.log('=== DECISION PAGE CHOICE DETECTION DEBUG ===')
      console.log('Current page ID:', params.id)
      console.log('Current decision_id:', decision.decision_id)
      console.log('Looking for decisions where previous_decision =', decision.decision_id)
      console.log('All user decisions:', userDecisions.length)
      console.log('User decisions FROM this page:', userDecisions.filter((d: any) => 
        d.previous_decision === decision.decision_id
      ))
      console.log('Found choice made FROM this page:', !!choiceMadeFromThisPage)
      if (choiceMadeFromThisPage) {
        console.log('Choice details:', {
          id: choiceMadeFromThisPage.id,
          decision_id: choiceMadeFromThisPage.decision_id,
          spacepiratenarratives_id: choiceMadeFromThisPage.spacepiratenarratives_id,
          complete: choiceMadeFromThisPage.complete,
          previous_decision: choiceMadeFromThisPage.previous_decision,
          created_at: new Date(choiceMadeFromThisPage.created_at).toISOString()
        })
      }
      
      if (choiceMadeFromThisPage) {
        console.log('Choice made from this page found, setting userDecisionFromThisPage')
        setUserDecisionFromThisPage(choiceMadeFromThisPage)
      } else {
        // Clear the decision state if no choice found
        console.log('No choice found from this page, clearing userDecisionFromThisPage')
        setUserDecisionFromThisPage(null)
      }
      
      // Get player status from query params or use the latest saved values
      const queryMorale = searchParams.get('morale')
      const queryResources = searchParams.get('resources')
      const queryCondition = searchParams.get('condition')
      
      if (queryMorale && queryResources && queryCondition) {
        // Use query params if available (passed from home page)
        setPlayerStatus({
          morale: parseFloat(queryMorale),
          resources: parseInt(queryResources),
          condition: parseFloat(queryCondition)
        })
      } else if (sortedUserDecisions.length > 0) {
        // Use the latest decision's saved values as the current status
        const latestDecision = sortedUserDecisions[sortedUserDecisions.length - 1]
        
        // If viewing a past decision, use the values from that point in time
        let relevantDecision = latestDecision
        if (choiceMadeFromThisPage) {
          // Find the decision just before this one
          const currentIndex = sortedUserDecisions.findIndex((d: any) => d.id === choiceMadeFromThisPage.id)
          if (currentIndex > 0) {
            relevantDecision = sortedUserDecisions[currentIndex - 1]
          } else {
            // This is the first decision, use initial values
            relevantDecision = null
          }
        }
        
        if (relevantDecision) {
          setPlayerStatus({
            // Use saved values directly - they're already the final calculated values
            condition: relevantDecision.shipcondition_after ?? 0.8,
            morale: relevantDecision.morale_after ?? 0.8,
            resources: relevantDecision.resources_after ?? 65
          })
        } else {
          // Initial values for first decision
          setPlayerStatus({
            condition: 0.8,
            morale: 0.8,
            resources: 65
          })
        }
      } else {
        // No decisions made yet, use initial values
        setPlayerStatus({
          condition: 0.8,
          morale: 0.8,
          resources: 65
        })
      }
    } catch (error) {
      console.error("Failed to fetch decision:", error)
      throw error
    }
  }

  useEffect(() => {
    // Scroll to top when navigating to a new decision page
    window.scrollTo(0, 0)
    
    // Always fetch data with effective email for debugging
    console.log('Decision page fetching data for user:', effectiveEmail)
    
    async function loadData() {
      try {
        await fetchDecisionData()
      } catch (error) {
        console.error('Error loading decision data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [params.id, effectiveEmail, searchParams])

  const handleChoiceClick = (choice: NextChoice) => {
    setSelectedNextDecision(choice.id)
    setShowNextDecisionDialog(true)
  }

  const handleConfirmDecision = async () => {
    if (!selectedNextDecision || !decisionData) return
    
    setIsLoadingNext(true)
    
    try {
      // Find the selected choice
      const selectedChoice = decisionData.next.find(c => c.id === selectedNextDecision)
      if (!selectedChoice) return
      
      console.log('=== SELECTED CHOICE DELTA VALUES ===')
      console.log('Selected choice ID:', selectedNextDecision)
      console.log('Selected choice details:', {
        id: selectedChoice.id,
        decision_id: selectedChoice.decision_id,
        description: selectedChoice.decision_description,
        delta_values_from_database: {
          condition: selectedChoice.condition,
          morale: selectedChoice.morale, 
          resources: selectedChoice.resources
        }
      })
      console.log('======================================')
      
      // Calculate new stats with proper rounding to prevent floating point precision errors
      const newStats = {
        morale: clampMoraleCondition(playerStatus.morale + selectedChoice.morale),
        resources: clampResources(playerStatus.resources + selectedChoice.resources),
        condition: clampMoraleCondition(playerStatus.condition + selectedChoice.condition)
      }

      console.log('=== DECISION CALCULATION DEBUG ===')
      console.log('Player Status Before:', playerStatus)
      console.log('Selected Choice Changes:', {
        condition: selectedChoice.condition,
        morale: selectedChoice.morale,
        resources: selectedChoice.resources
      })
      console.log('Raw Calculations (before clamping):', {
        morale: playerStatus.morale + selectedChoice.morale,
        condition: playerStatus.condition + selectedChoice.condition,
        resources: playerStatus.resources + selectedChoice.resources
      })
      console.log('Final New Stats (after clamping):', newStats)
      console.log('Payload to be sent:', {
        morale_before: playerStatus.morale,
        condition_before: playerStatus.condition,
        resources_before: playerStatus.resources,
        morale_after: newStats.morale,
        shipcondition_after: newStats.condition,
        resources_after: newStats.resources
      })
      console.log('=====================================')

      // POST to Xano spacepirates endpoint
      const payload = {
        decision_id: selectedChoice.decision_id,  // The choice being made (destination)
        email: effectiveEmail,
        previous_decision: decisionData.decision_id, // Where they came from
        morale_before: playerStatus.morale,
        condition_before: playerStatus.condition,
        resources_before: playerStatus.resources,
        morale_after: newStats.morale,
        shipcondition_after: newStats.condition,
        resources_after: newStats.resources,
        spacepiratenarratives_id: selectedNextDecision, // Destination narrative ID
        complete: false  // Mark as incomplete - user has arrived but not made a choice yet
      }

      const response = await fetch(`${XANO_BASE_URL}/spacepirates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const savedDecision = await response.json()
        console.log('=== SAVED DECISION DATA ===')
        console.log('Data returned from API after save:', savedDecision)
        console.log('Values that should match payload:', {
          morale_after: savedDecision.morale_after,
          shipcondition_after: savedDecision.shipcondition_after,
          resources_after: savedDecision.resources_after
        })
        console.log('===========================')
        
        // Also update the current decision (where choice was made FROM) to mark it as complete
        // Find the existing record for the current decision page
        const userMadeDecisions = await fetch(`${XANO_BASE_URL}/spacepirates`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
        const allUserDecisions = await userMadeDecisions.json()
        
        const currentDecisionRecord = allUserDecisions.find((decision: UserDecision) => 
          decision.spacepiratenarratives_id === parseInt(params.id as string) && 
          decision.email === effectiveEmail
        )
        
        if (currentDecisionRecord) {
          console.log('Updating current decision record to complete:', currentDecisionRecord.id)
          try {
            const updateResponse = await fetch(`${XANO_BASE_URL}/spacepirates/${currentDecisionRecord.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                complete: true
              }),
            })
            
            if (updateResponse.ok) {
              console.log('Successfully marked current decision as complete')
              
              // Immediately refetch data to update the UI state
              console.log('Refetching data to update UI...')
              await fetchDecisionData()
              
              toast.success("Decision made successfully!")
              setShowNextDecisionDialog(false)
              
            } else {
              console.error('Failed to update current decision to complete')
              throw new Error('Failed to mark decision as complete')
            }
          } catch (updateError) {
            console.error('Error updating current decision:', updateError)
            throw updateError
          }
        } else {
          console.warn('Could not find current decision record to mark as complete')
          // Still refetch data in case the decision was created successfully
          await fetchDecisionData()
          toast.success("Decision made successfully!")
          setShowNextDecisionDialog(false)
        }
        
      } else {
        throw new Error('Failed to save decision')
      }
    } catch (error) {
      console.error('Error saving decision:', error)
      toast.error('Failed to save decision. Please try again.')
    } finally {
      setIsLoadingNext(false)
    }
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
          router.push('/')
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
        
        // Navigate back to home
        router.push('/')
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

  // Check if this decision has already been made by the user
  // A decision is made if there's a user decision that came FROM this page
  const isDecisionCompleted = !!userDecisionFromThisPage

  // Check if this is a final decision (decision_id contains FINAL_)
  const isFinalDecision = decisionData?.decision_id?.includes('FINAL_') || decisionData?.decision_id?.includes('ENDING') || decisionData?.decision_id?.includes('END')
  
  // Check if game is completed (user has reached a final decision)
  const gameCompleted = userDecisionFromThisPage && (
    userDecisionFromThisPage.decision_id?.includes('FINAL_') || 
    userDecisionFromThisPage.decision_id?.includes('ENDING') ||
    userDecisionFromThisPage.decision_id?.includes('END') ||
    isFinalDecision
  )

  // Show reset button on any FINAL_ page
  const showResetButton = isFinalDecision

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <Skeleton className="h-96 mb-8" />
        </div>
      </div>
    )
  }

  if (!decisionData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Command Center
          </Link>
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Decision Not Found</h2>
              <p className="text-muted-foreground">The requested decision could not be loaded.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">

        {/* Game Completion Section */}
        {gameCompleted && (
          <div className="mb-6 p-4 bg-muted/50 border border-muted rounded-lg print:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-100 dark:hover:bg-green-800 font-mono">
                  Mission Complete
                </Badge>
                <span className="text-sm text-muted-foreground font-mono">Adventure finished successfully</span>
              </div>
            </div>
          </div>
        )}

        {/* Hero Banner */}
        <div className="w-full mb-8 print:hidden">
          {/* Hero Image */}
          <div className="relative w-full h-80 md:h-96 overflow-hidden rounded-xl mb-6">
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url(${getHeroImageForDecision(decisionData)})`
              }}
            />
            
            {/* Overlay Buttons */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              <Button 
                variant="secondary" 
                onClick={() => router.push('/')}
                className="bg-white hover:bg-gray-50 text-foreground shadow-lg"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Command Center
              </Button>
              
              <Button 
                variant="secondary" 
                onClick={() => window.print()}
                className="bg-white hover:bg-gray-50 text-foreground shadow-lg"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print PDF
              </Button>
            </div>
          </div>
          
          {/* Content Below Image */}
          <div className="mb-8">
            <div className="mb-4">
              {decisionData.decision_number > 0 && (
                <div className="text-sm font-mono text-muted-foreground mb-2">
                  Decision {decisionData.decision_number}
                </div>
              )}
              {decisionData.decision_number === 0 && (
                <div className="text-sm font-mono text-muted-foreground mb-2">
                  START
                </div>
              )}
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                {decisionData.decision_title}
              </h1>
              {(decisionData.decision_summary || decisionData.decision_description) && (
                <p className="text-lg md:text-xl text-muted-foreground mb-4 max-w-3xl">
                  {decisionData.decision_summary || decisionData.decision_description}
                </p>
              )}
              <div className="flex items-center space-x-2">
                {isDecisionCompleted && (
                  <Badge variant="secondary" className="font-mono text-xs bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-100 dark:hover:bg-green-800">
                    Completed
                  </Badge>
                )}
                {isFinalDecision && (
                  <Badge variant="default" className="font-mono text-xs bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-100 dark:hover:bg-purple-800">
                    Final Decision
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Decision Content - Blog Format */}
        <article className="mb-12">
          {/* Print-only header */}
          <div className="hidden print:block mb-8">
            <div className="print-title">Extraction Protocol: Code Black</div>
            <div className="print-subtitle">{decisionData.decision_title}</div>
            <h1 className="text-3xl font-bold mb-2 mt-4">{decisionData?.decision_title}</h1>
            {(decisionData?.decision_number ?? 0) > 0 && (
              <p className="text-lg text-gray-600">Decision {decisionData?.decision_number}</p>
            )}
          </div>

          <div className="mb-12 print:mb-0">
            {decisionData.decision_text && (
              <MarkdownContent content={decisionData.decision_text} />
            )}
          </div>
        </article>

        {/* Choice Cards - Side by Side */}
        {decisionData.next && decisionData.next.length > 0 && (
          <div className="mb-12 print:hidden">
            <h2 className="text-2xl font-bold mb-6 text-left">
              {isDecisionCompleted ? "Your Decision" : "Make Your Decision"}
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {decisionData.next.map((choice) => {
                // Determine if this is the choice the user made FROM this page
                // Compare: choice.id (where this choice leads) vs userDecisionFromThisPage.spacepiratenarratives_id (where user went)
                const isSelectedChoice = isDecisionCompleted && userDecisionFromThisPage && 
                  choice.id === userDecisionFromThisPage.spacepiratenarratives_id
                const isOtherChoice = isDecisionCompleted && !isSelectedChoice



                return (
                  <Card 
                    key={choice.id} 
                    className={`h-full flex flex-col transition-all bg-white dark:bg-card shadow-md ${
                      isSelectedChoice 
                        ? "border-green-500 bg-green-50 dark:bg-green-950/30" 
                        : isOtherChoice 
                        ? "opacity-50 border-gray-200 bg-gray-50 dark:bg-gray-900/50" 
                        : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600 hover:shadow-lg"
                    }`}
                  >
                    <CardHeader className="pb-4">
                      {isSelectedChoice && (
                        <div className="mb-3">
                          <Badge variant="secondary" className="bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900 dark:text-green-100 dark:hover:bg-green-800 font-mono text-xs">
                            Chosen on {new Date(userDecisionFromThisPage?.created_at ?? 0).toLocaleDateString()}
                          </Badge>
                        </div>
                      )}
                      {choice.decision_description && (
                        <CardDescription className="text-base leading-relaxed text-foreground font-medium">
                          {choice.decision_description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col pt-0">
                      {!isDecisionCompleted && (
                        <Button 
                          className="w-full mt-auto bg-black hover:bg-gray-800 text-white font-medium py-3" 
                          size="lg"
                          onClick={() => handleChoiceClick(choice)}
                          disabled={isLoadingNext}
                        >
                          {isLoadingNext ? "Making Decision..." : "Choose This Path"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Impact of Decision - Only show for completed decisions */}
        {isDecisionCompleted && userDecisionFromThisPage && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6 text-left">Impact of Your Decision</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Wrench className="h-4 w-4 mr-2" />
                    Ship Condition
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm mb-2 font-mono">
                    <span className="text-muted-foreground">Before:</span>
                    <span className={getStatusColor(userDecisionFromThisPage.condition_before ?? 0)}>
                      {formatPercentage(userDecisionFromThisPage.condition_before ?? 0)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2 font-mono">
                    <span className="text-muted-foreground">Change:</span>
                    <span className={`font-bold ${(userDecisionFromThisPage._spacepiratenarratives_singleitem?.condition ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {userDecisionFromThisPage._spacepiratenarratives_singleitem?.condition === 0 ? '0%' : `${(userDecisionFromThisPage._spacepiratenarratives_singleitem?.condition ?? 0) >= 0 ? '+' : ''}${Math.round((userDecisionFromThisPage._spacepiratenarratives_singleitem?.condition ?? 0) * 100)}%`}
                    </span>
                  </div>
                  {userDecisionFromThisPage._spacepiratenarratives_singleitem?.condition_description && (
                    <div className="text-xs text-muted-foreground mb-2 italic">
                      {userDecisionFromThisPage._spacepiratenarratives_singleitem.condition_description}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm font-mono">
                    <span className="text-muted-foreground">After:</span>
                    <span className={`font-bold ${getStatusColor(userDecisionFromThisPage.shipcondition_after ?? 0)}`}>
                      {formatPercentage(userDecisionFromThisPage.shipcondition_after ?? 0)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Crew Morale
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm mb-2 font-mono">
                    <span className="text-muted-foreground">Before:</span>
                    <span className={getStatusColor(userDecisionFromThisPage.morale_before ?? 0)}>
                      {formatPercentage(userDecisionFromThisPage.morale_before ?? 0)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2 font-mono">
                    <span className="text-muted-foreground">Change:</span>
                    <span className={`font-bold ${(userDecisionFromThisPage._spacepiratenarratives_singleitem?.morale ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {userDecisionFromThisPage._spacepiratenarratives_singleitem?.morale === 0 ? '0%' : `${(userDecisionFromThisPage._spacepiratenarratives_singleitem?.morale ?? 0) >= 0 ? '+' : ''}${Math.round((userDecisionFromThisPage._spacepiratenarratives_singleitem?.morale ?? 0) * 100)}%`}
                    </span>
                  </div>
                  {userDecisionFromThisPage._spacepiratenarratives_singleitem?.morale_description && (
                    <div className="text-xs text-muted-foreground mb-2 italic">
                      {userDecisionFromThisPage._spacepiratenarratives_singleitem.morale_description}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm font-mono">
                    <span className="text-muted-foreground">After:</span>
                    <span className={`font-bold ${getStatusColor(userDecisionFromThisPage.morale_after ?? 0)}`}>
                      {formatPercentage(userDecisionFromThisPage.morale_after ?? 0)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Coins className="h-4 w-4 mr-2" />
                    Resources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm mb-2 font-mono">
                    <span className="text-muted-foreground">Before:</span>
                    <span className={getStatusColor(userDecisionFromThisPage.resources_before ?? 0)}>
                      {userDecisionFromThisPage.resources_before ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2 font-mono">
                    <span className="text-muted-foreground">Change:</span>
                    <span className={`font-bold ${(userDecisionFromThisPage._spacepiratenarratives_singleitem?.resources ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {userDecisionFromThisPage._spacepiratenarratives_singleitem?.resources === 0 ? '0' : `${(userDecisionFromThisPage._spacepiratenarratives_singleitem?.resources ?? 0) >= 0 ? '+' : ''}${userDecisionFromThisPage._spacepiratenarratives_singleitem?.resources ?? 0}`}
                    </span>
                  </div>
                  {userDecisionFromThisPage._spacepiratenarratives_singleitem?.resources_description && (
                    <div className="text-xs text-muted-foreground mb-2 italic">
                      {userDecisionFromThisPage._spacepiratenarratives_singleitem.resources_description}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm font-mono">
                    <span className="text-muted-foreground">After:</span>
                    <span className={`font-bold ${getStatusColor(userDecisionFromThisPage.resources_after ?? 0)}`}>
                      {userDecisionFromThisPage.resources_after ?? 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Reflection Questions - Only show for completed decisions */}
        {isDecisionCompleted && userDecisionFromThisPage && (
          userDecisionFromThisPage._spacepiratenarratives_singleitem?.reflective_prompt_1 ||
          userDecisionFromThisPage._spacepiratenarratives_singleitem?.reflective_prompt_2 ||
          userDecisionFromThisPage._spacepiratenarratives_singleitem?.reflective_prompt_3 ||
          userDecisionFromThisPage._spacepiratenarratives_singleitem?.reflective_prompt_4
        ) && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6 text-left">Reflection Questions</h2>
            <p className="text-muted-foreground mb-6">Take a moment to reflect on this pivotal moment in your journey.</p>
            <div className="space-y-4">
              {userDecisionFromThisPage._spacepiratenarratives_singleitem?.reflective_prompt_1 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Badge variant="outline" className="font-mono text-xs mt-1">
                        Question 1
                      </Badge>
                      <p className="text-sm leading-relaxed text-foreground flex-1">
                        {userDecisionFromThisPage._spacepiratenarratives_singleitem.reflective_prompt_1}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {userDecisionFromThisPage._spacepiratenarratives_singleitem?.reflective_prompt_2 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Badge variant="outline" className="font-mono text-xs mt-1">
                        Question 2
                      </Badge>
                      <p className="text-sm leading-relaxed text-foreground flex-1">
                        {userDecisionFromThisPage._spacepiratenarratives_singleitem.reflective_prompt_2}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {userDecisionFromThisPage._spacepiratenarratives_singleitem?.reflective_prompt_3 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Badge variant="outline" className="font-mono text-xs mt-1">
                        Question 3
                      </Badge>
                      <p className="text-sm leading-relaxed text-foreground flex-1">
                        {userDecisionFromThisPage._spacepiratenarratives_singleitem.reflective_prompt_3}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {userDecisionFromThisPage._spacepiratenarratives_singleitem?.reflective_prompt_4 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Badge variant="outline" className="font-mono text-xs mt-1">
                        Question 4
                      </Badge>
                      <p className="text-sm leading-relaxed text-foreground flex-1">
                        {userDecisionFromThisPage._spacepiratenarratives_singleitem.reflective_prompt_4}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Navigation after decision is made */}
        {isDecisionCompleted && (
          <div className="mt-8 flex flex-col gap-3 print:hidden">
            <Button 
              onClick={() => router.push('/')}
              size="lg"
              variant="outline"
              className="w-full"
            >
              Return to Command Center
            </Button>
            {showResetButton && (
              <Button 
                onClick={handleStartOver}
                disabled={isStartingOver}
                size="lg"
                className="w-full bg-black hover:bg-gray-800 text-white"
              >
                {isStartingOver ? "Resetting..." : "Start New Journey"}
              </Button>
            )}
          </div>
        )}

        {/* Show reset button even if decision not completed, but on FINAL_ pages */}
        {!isDecisionCompleted && showResetButton && (
          <div className="mt-8 print:hidden">
            <Button 
              onClick={handleStartOver}
              disabled={isStartingOver}
              size="lg"
              className="w-full bg-black hover:bg-gray-800 text-white"
            >
              {isStartingOver ? "Resetting..." : "Start New Journey"}
            </Button>
          </div>
        )}

        {/* Next Decision Dialog */}
        <DecisionConfirmationModal
          isOpen={showNextDecisionDialog}
          onClose={() => setShowNextDecisionDialog(false)}
          onConfirm={handleConfirmDecision}
          choice={decisionData?.next.find(c => c.id === selectedNextDecision) || null}
          isSubmitting={isLoadingNext}
        />
      </div>
    </div>
  )
}
