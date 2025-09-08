"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import { DecisionConfirmationModal } from "@/components/decision-confirmation-modal"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const XANO_BASE_URL = "https://xsc3-mvx7-r86m.n7e.xano.io/api:7l5S8ZC7"

// Define the structure for a decision choice
interface NextChoice {
  id: number
  decision_id: string
  decision_title: string
  decision_description: string
  decision_choice?: string
  story: string
  condition: number
  morale: number
  resources: number
  choice: string
  decision_number: number
  condition_description?: string
  morale_description?: string
  resources_description?: string
  story_summary?: string
  result_summary?: string
  reflective_prompt_1?: string
  reflective_prompt_2?: string
  reflective_prompt_3?: string
  reflective_prompt_4?: string
  hero_image?: string
  decision_summary?: string
  decision_text?: string
  sequence?: number
}

// Define the structure for decision detail
interface DecisionDetail {
  id: number
  decision_id: string
  decision_title: string
  decision_description: string
  story: string
  condition: number
  morale: number
  resources: number
  choice: string
  decision_number: number
  created_at?: number
  next: NextChoice[]
  from?: NextChoice[]
  condition_description?: string
  morale_description?: string
  resources_description?: string
  reflective_prompt_1?: string
  reflective_prompt_2?: string
  reflective_prompt_3?: string
  reflective_prompt_4?: string
  hero_image?: string
}

// Player status interface
interface PlayerStatus {
  morale: number
  resources: number
  condition: number
}

// MarkdownContent component for rendering story text
const MarkdownContent = ({ content }: { content: string }) => {
  if (!content || typeof content !== 'string') {
    return <p className="text-gray-600">No content available</p>
  }

  const formatText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p class="mb-4 leading-relaxed">')
      .replace(/\n/g, '<br />')
  }

  const startsWithHeading = content.trim().startsWith('#')

  return (
    <div 
      className="prose prose-lg max-w-none"
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
  const { data: session, status: sessionStatus } = useSession()
  
  const [showNextDecisionDialog, setShowNextDecisionDialog] = useState(false)
  const [isLoadingNext, setIsLoadingNext] = useState(false)
  const [selectedNextDecision, setSelectedNextDecision] = useState<number | null>(null)
  const [confirmedChoiceId, setConfirmedChoiceId] = useState<number | null>(null)
  const [impactData, setImpactData] = useState<{
    oldStats: { morale: number; resources: number; condition: number }
    newStats: { morale: number; resources: number; condition: number }
    choice: any
  } | null>(null)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [finalStats, setFinalStats] = useState<{
    morale: number
    resources: number
    condition: number
  } | null>(null)
  const [decisionData, setDecisionData] = useState<DecisionDetail | null>(null)
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>({
    morale: 0,
    resources: 0,
    condition: 0
  })
  const [loading, setLoading] = useState(true)

  // Get user email from session or URL params as fallback
  const sessionEmail = session?.user?.email
  const urlEmail = searchParams.get('user_email') // Add user_email to URL when navigating from home page
  const userEmail = sessionEmail || urlEmail
  const effectiveEmail = userEmail || 'guest'
  
  console.log('Decision page session status:', sessionStatus, 'Session email:', sessionEmail, 'URL email:', urlEmail, 'Effective email:', effectiveEmail)

  const getStatusColor = (value: number) => {
    // Convert decimal to percentage if needed (Xano API uses 0.0-1.0 format)
    const percentage = value <= 1 ? value * 100 : value
    if (percentage >= 70) return "text-green-600"
    if (percentage >= 40) return "text-yellow-600"
    return "text-red-600"
  }

  // Check if this is the final ending (decision_number = 6) - moved here to be available earlier
  const isFinalEnding = decisionData?.decision_number === 6 || 
    (decisionData?.next && decisionData.next.length === 0 && (decisionData?.decision_number || 0) >= 6)

  // Load story data when page mounts
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const storyId = params.id as string
        console.log('Loading story with ID:', storyId)
        
        // Validate story ID
        const storyIdNum = parseInt(storyId)
        if (!storyId || storyId === 'undefined' || storyId === 'null' || isNaN(storyIdNum) || storyIdNum < 1) {
          console.error('Invalid story ID:', storyId, 'Parsed value:', storyIdNum)
          toast.error('Invalid story ID. Please return to the dashboard.')
          setDecisionData(null)
          setLoading(false)
          return
        }
        
        // Call the island_survival_stories endpoint
        const url = `${XANO_BASE_URL}/island_survival_stories/${storyId}`
        console.log('Fetching from URL:', url)
        
        const response = await fetch(url, {
          method: 'GET',
        headers: {
            'Content-Type': 'application/json',
          }
        })
        
        console.log('Response status:', response.status)
        console.log('Response ok:', response.ok)
        
        if (response.ok) {
          const storyData = await response.json()
          console.log('Story data from API:', storyData)
          
          // Check if we got the expected data structure
          if (storyData.current_story && storyData.next_stories) {
            // Handle the response structure with current_story and next_story
            const currentStory = storyData.current_story
            console.log('Using current_story:', currentStory)
            
            const mappedDecision: DecisionDetail = {
              id: currentStory.id || parseInt(storyId),
              decision_id: currentStory.decision_id || '',
              decision_title: currentStory.decision_title || 'Decision',
              decision_description: currentStory.decision_description || '',
              story: currentStory.story || '',
              condition: currentStory.condition || 0,
              morale: currentStory.morale || 0,
              resources: currentStory.resources || 0,
              choice: currentStory.choice || '',
              decision_number: currentStory.sequence || 0,
              created_at: currentStory.created_at || Date.now(),
              condition_description: currentStory.condition_description || '',
              morale_description: currentStory.morale_description || '',
              resources_description: currentStory.resources_description || '',
              reflective_prompt_1: currentStory.reflective_prompt_1 || '',
              reflective_prompt_2: currentStory.reflective_prompt_2 || '',
              reflective_prompt_3: currentStory.reflective_prompt_3 || '',
              reflective_prompt_4: currentStory.reflective_prompt_4 || '',
              hero_image: currentStory.hero_image || '',
              next: storyData.next_stories || []
            }
            
            console.log('Setting decision data from current_story:', mappedDecision)
            setDecisionData(mappedDecision)
            
            // Set player status from the current story if not in URL
            const urlMorale = searchParams.get('morale')
            const urlResources = searchParams.get('resources')
            const urlCondition = searchParams.get('condition')
            
            if (!urlMorale && !urlResources && !urlCondition) {
              setPlayerStatus({
                morale: currentStory.morale || 0,
                resources: currentStory.resources || 0,
                condition: currentStory.condition || 0
              })
            }
          } else {
            // Fallback to direct mapping if structure is different
            console.log('Using direct story data mapping')
            
            const mappedDecision: DecisionDetail = {
              id: storyData.id || parseInt(storyId),
              decision_id: storyData.decision_id || '',
              decision_title: storyData.decision_title || 'Decision',
              decision_description: storyData.decision_description || '',
              story: storyData.story || '',
              condition: storyData.condition || 0,
              morale: storyData.morale || 0,
              resources: storyData.resources || 0,
              choice: storyData.choice || '',
              decision_number: storyData.sequence || 0,
              created_at: storyData.created_at || Date.now(),
              condition_description: storyData.condition_description || '',
              morale_description: storyData.morale_description || '',
              resources_description: storyData.resources_description || '',
              reflective_prompt_1: storyData.reflective_prompt_1 || '',
              reflective_prompt_2: storyData.reflective_prompt_2 || '',
              reflective_prompt_3: storyData.reflective_prompt_3 || '',
              reflective_prompt_4: storyData.reflective_prompt_4 || '',
              hero_image: storyData.hero_image || '',
              next: storyData.next_stories || storyData.next_story || []
            }
            
            setDecisionData(mappedDecision)
            
            // Set player status from URL or story data
            const urlMorale = searchParams.get('morale')
            const urlResources = searchParams.get('resources')
            const urlCondition = searchParams.get('condition')
            
        setPlayerStatus({
              morale: urlMorale ? parseFloat(urlMorale) : (storyData.morale || 0),
              resources: urlResources ? parseInt(urlResources) : (storyData.resources || 0),
              condition: urlCondition ? parseFloat(urlCondition) : (storyData.condition || 0)
            })
          }
        } else {
          console.error('Failed to fetch story:', response.status, response.statusText)
          const errorText = await response.text()
          console.error('Error response:', errorText)
          toast.error('Failed to load story data')
          setDecisionData(null)
        }
        
        // Player status is now set above based on story data or URL params
        
        // Check if this decision was already made by the user
        // We'll do this after loading the decision data to match choices properly
      } catch (error) {
        console.error('Error loading decision data:', error)
        toast.error('Failed to load decision data')
        setDecisionData(null)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [params.id, searchParams])

  // Check if this decision was already completed by the user
  useEffect(() => {
    const checkCompletedDecision = async () => {
      if (!decisionData || !userEmail || userEmail === 'guest') return

      try {
        const userScoresResponse = await fetch(`${XANO_BASE_URL}/user_all_scores?user_email=${encodeURIComponent(userEmail)}`)
        if (userScoresResponse.ok) {
          const userScoresData = await userScoresResponse.json()
          if (userScoresData.score_records) {
            // Find a record where the previous_decision matches this story's decision_id
            const nextDecisionRecord = userScoresData.score_records.find((record: any) => 
              record.previous_decision === decisionData.decision_id
            )
            
            if (nextDecisionRecord) {
              console.log('Found next decision record, this decision was completed:', nextDecisionRecord)
              
              // Find which choice matches the next story
              const matchingChoice = decisionData.next.find(choice => 
                choice.id === nextDecisionRecord.current_story
              )
              
              if (matchingChoice) {
                console.log('Found matching choice:', matchingChoice)
                setConfirmedChoiceId(matchingChoice.id)
                
                // For completed decisions, we need to get the before values from the current story data
                // The before values should come from the current decision page's story data
                setImpactData({
                  oldStats: {
                    morale: decisionData.morale,
                    resources: decisionData.resources,
                    condition: decisionData.condition
                  },
                  newStats: {
                    morale: nextDecisionRecord.morale_after,
                    resources: nextDecisionRecord.resources_after,
                    condition: nextDecisionRecord.shipcondition_after
                  },
                  choice: matchingChoice
                })
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking for completed decision:', error)
      }
    }

    checkCompletedDecision()
  }, [decisionData, userEmail])

  // Fetch final stats for ending page
  useEffect(() => {
    const fetchFinalStats = async () => {
      if (!isFinalEnding || !userEmail || userEmail === 'guest') return

      try {
        const userScoresResponse = await fetch(`${XANO_BASE_URL}/user_all_scores?user_email=${encodeURIComponent(userEmail)}`)
        if (userScoresResponse.ok) {
          const userScoresData = await userScoresResponse.json()
          if (userScoresData.score_records && userScoresData.score_records.length > 0) {
            // Get the latest record (should be the final decision)
            const latestRecord = userScoresData.score_records.sort((a: any, b: any) => b.created_at - a.created_at)[0]
            
            console.log('Final stats from latest record:', latestRecord)
            
            setFinalStats({
              morale: latestRecord.morale_after || 0,
              resources: latestRecord.resources_after || 0,
              condition: latestRecord.shipcondition_after || 0
            })
          }
        }
      } catch (error) {
        console.error('Error fetching final stats:', error)
      }
    }

    fetchFinalStats()
  }, [isFinalEnding, userEmail])

  const handleChoiceClick = (choice: NextChoice) => {
    setSelectedNextDecision(choice.id)
    setShowNextDecisionDialog(true)
  }

  const handleConfirmDecision = async () => {
    if (!selectedNextDecision || !decisionData) {
      console.error('Missing required data for decision')
      return
    }
    
    setIsLoadingNext(true)
    
    try {
      // Find the selected choice
      const selectedChoice = decisionData.next.find(c => c.id === selectedNextDecision)
      if (!selectedChoice) {
        throw new Error('Selected choice not found')
      }

      // Calculate new stats with proper capping
      const newStats: PlayerStatus = {
        morale: Math.max(0, Math.min(1, playerStatus.morale + (selectedChoice.morale || 0))),
        resources: Math.max(0, playerStatus.resources + (selectedChoice.resources || 0)), // No upper limit for resources
        condition: Math.max(0, Math.min(1, playerStatus.condition + (selectedChoice.condition || 0)))
      }
      
      console.log('Creating score record for choice:', selectedChoice)
      console.log('Current player status:', playerStatus)
      console.log('New stats after choice:', newStats)
      console.log('Current decision data:', decisionData)
      console.log('Session user email:', session?.user?.email)
      
      // POST to island_survival_score
      console.log('User email:', effectiveEmail)
      console.log('Session status in handleConfirmDecision:', sessionStatus, 'Session email:', session?.user?.email)
      
      // Only post if we have a real user email (not guest) - check both session and URL params
      if (effectiveEmail && effectiveEmail !== 'guest' && userEmail) {
        try {
          const scorePayload = {
            id: selectedChoice.id,  // The story ID integer (not decision_id text)
            decision_id: selectedChoice.decision_id || '',
            email: userEmail,
        morale_after: newStats.morale,
        resources_after: newStats.resources,
            shipcondition_after: newStats.condition,
            current_story: selectedChoice.id,
            current_sequence: selectedChoice.sequence || selectedChoice.decision_number || 0,
            decision_number: selectedChoice.decision_number || 0,
            complete: false,
            previous_decision: decisionData.decision_id || '',
            score: 0
          }
          
          console.log('POST to island_survival_score with payload:', scorePayload)
          
          const scoreResponse = await fetch(`${XANO_BASE_URL}/island_survival_score`, {
        method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            body: JSON.stringify(scorePayload)
          })
          
          console.log('Score POST response status:', scoreResponse.status)
          
          if (!scoreResponse.ok) {
            const errorText = await scoreResponse.text()
            console.error('Failed to save score:', scoreResponse.status, errorText)
          } else {
            const scoreResult = await scoreResponse.json()
            console.log('Score saved successfully:', scoreResult)
            console.log('Backend function stack should have marked previous records as complete automatically')
          }
        } catch (error) {
          console.error('Error saving score or marking records as complete:', error)
          }
        } else {
        console.log('Skipping score save - user not logged in or guest user')
        // Still show success for guest users
        toast.info('Decision recorded (login to save progress)')
      }

      // Update player status
      setPlayerStatus(newStats)
      
      // Mark the choice as confirmed (turn it green)
      setConfirmedChoiceId(selectedChoice.id)
      
      // Store impact data for display using actual before/after values
      setImpactData({
        oldStats: playerStatus,
        newStats,
        choice: selectedChoice
      })
      
      // Show success message if logged in
      if (effectiveEmail && effectiveEmail !== 'guest' && session?.user?.email) {
        toast.success('Decision saved successfully!')
      }
      
      // Close dialog
          setShowNextDecisionDialog(false)
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
    
    // Show confirmation dialog
    const confirmed = window.confirm("Are you sure you want to start over? This will reset your progress.")
    if (!confirmed) return
    
    try {
      // No API calls - just reset and navigate
          toast.success("Starting fresh adventure!")
      router.push("/")
    } catch (error) {
      console.error('Error starting over:', error)
      toast.error('Failed to reset journey. Please try again.')
    }
  }

  const handleResetGame = () => {
    if (!userEmail || userEmail === 'guest') {
      toast.error("Please log in to reset your game")
      return
    }
    
    setShowResetDialog(true)
  }

  const confirmReset = async () => {
    setIsResetting(true)
    
    try {
      // First, get all user's score records to delete them
      const scoresResponse = await fetch(`${XANO_BASE_URL}/user_all_scores?user_email=${encodeURIComponent(userEmail)}`)
      if (scoresResponse.ok) {
        const scoresData = await scoresResponse.json()
        if (scoresData.score_records) {
          // Delete each score record
          for (const record of scoresData.score_records) {
            const deleteResponse = await fetch(`${XANO_BASE_URL}/island_survival_score/${record.id}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              }
            })
            
            if (!deleteResponse.ok) {
              console.error(`Failed to delete score record ${record.id}`)
            }
          }
        }
      }
      
      // Delete user settings
      const settingsResponse = await fetch(`${XANO_BASE_URL}/island_survival_settings?email=${encodeURIComponent(userEmail)}`)
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json()
        if (Array.isArray(settingsData)) {
          // Delete each settings record for this user
          for (const setting of settingsData) {
            if (setting.email === userEmail) {
              const deleteSettingsResponse = await fetch(`${XANO_BASE_URL}/island_survival_settings/${setting.id}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                }
              })
              
              if (!deleteSettingsResponse.ok) {
                console.error(`Failed to delete settings record ${setting.id}`)
              }
            }
          }
        }
      }
      
      toast.success("Game reset successfully! Starting fresh adventure...")
      
      // Close dialog and reload the page to trigger create_new_story
      setShowResetDialog(false)
      setTimeout(() => {
        // Force a full page reload to ensure create_new_story POST runs and status cards reset
        window.location.reload()
        setTimeout(() => {
          window.location.href = "/"
        }, 500)
      }, 1000)
      
    } catch (error) {
      console.error('Error resetting game:', error)
      toast.error('Failed to reset game. Please try again.')
    } finally {
      setIsResetting(false)
    }
  }

  if (loading || sessionStatus === 'loading') {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="animate-pulse">
          <p className="text-center mb-4">
            {sessionStatus === 'loading' ? 'Loading session...' : 'Loading story data...'}
          </p>
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!decisionData) {
    const storyId = params.id as string
    const storyIdNum = parseInt(storyId)
    const isInvalidId = !storyId || storyId === 'undefined' || storyId === 'null' || isNaN(storyIdNum) || storyIdNum < 1
    
    return (
      <div className="container mx-auto p-6 max-w-6xl">
          <Card>
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              {isInvalidId ? 'Invalid Story ID' : 'Story Not Found'}
            </h2>
            <p className="text-gray-600 mb-4">
              {isInvalidId 
                ? 'The story ID provided is not valid. Story IDs must be positive numbers.'
                : 'The requested story could not be found.'}
            </p>
            <p className="text-sm text-gray-500 mb-6">Story ID: {params.id}</p>
            <Button 
              onClick={() => router.push('/')}
              className="w-full max-w-xs mx-auto"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Return to Dashboard
            </Button>
            </CardContent>
          </Card>
      </div>
    )
  }

  console.log('Rendering decision page with data:', {
    title: decisionData.decision_title,
    hasStory: !!decisionData.story,
    hasHeroImage: !!decisionData.hero_image,
    nextChoices: decisionData.next?.length || 0,
    isFinalEnding
  })

  // Show login prompt if user is not authenticated
  const showLoginPrompt = sessionStatus === 'unauthenticated'

  return (
    <div className="container mx-auto p-6 max-w-6xl">
          {/* Hero Image */}
      {decisionData.hero_image && (
        <div className="relative w-full h-64 md:h-96 mb-6 rounded-lg overflow-hidden">
          <img 
            src={decisionData.hero_image} 
            alt={decisionData.decision_title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          {/* Buttons on top of image */}
          <div className="absolute top-4 left-0 right-0 flex justify-between px-4">
              <Button 
                variant="secondary" 
              size="sm"
                onClick={() => router.push('/')}
              className="bg-white/90 hover:bg-white text-black"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Return to Dashboard
              </Button>
              <Button 
                variant="secondary" 
              size="sm"
                onClick={() => window.print()}
              className="bg-white/90 hover:bg-white text-black"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
              </Button>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <h1 className="text-4xl font-bold mb-2">{decisionData.decision_title}</h1>
            {decisionData.decision_description && (
              <p className="text-xl opacity-90">{decisionData.decision_description}</p>
            )}
                </div>
              </div>
              )}

      {/* Buttons when no hero image */}
      {!decisionData.hero_image && (
        <div className="flex justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Return to Dashboard
          </Button>
                        <Button 
            variant="outline"
            size="sm"
            onClick={() => window.print()}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
                        </Button>
                        </div>
                      )}

      {/* Main Story Card */}
      <Card className="mb-6">
        {!decisionData.hero_image && (
          <CardHeader>
            <CardTitle className="text-3xl font-bold">
                {decisionData.decision_title}
                  </CardTitle>
            {decisionData.decision_description && (
              <CardDescription className="text-lg mt-2">
                {decisionData.decision_description}
                        </CardDescription>
                      )}
                    </CardHeader>
        )}
                <CardContent className="p-6">
              <MarkdownContent content={decisionData.story} />
                    </CardContent>
                  </Card>


      {/* Final Ending Message */}
      {isFinalEnding && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-2xl">
                The End of Your Island Journey
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg mb-4">
                Congratulations! You have reached the end of your survival story. Your choices have shaped your destiny on the island.
              </p>
            </CardContent>
          </Card>

          {/* Final Score Cards */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4">Your Final Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Final Health (Condition) */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Final Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2">
                      <span className={`${getStatusColor(finalStats?.condition || 0)}`}>
                        {finalStats ? Math.round(finalStats.condition * 100) : 0}%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">Physical condition of the crew</p>
                  </div>
                </CardContent>
              </Card>

              {/* Final Morale */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Final Morale</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2">
                      <span className={`${getStatusColor(finalStats?.morale || 0)}`}>
                        {finalStats ? Math.round(finalStats.morale * 100) : 0}%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">Team spirit and motivation</p>
                  </div>
                </CardContent>
              </Card>

              {/* Final Resources */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Final Resources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2">
                      <span className={`${getStatusColor(finalStats?.resources || 0)}`}>
                        {finalStats?.resources || 0}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">Food, water, and supplies</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Reset Button */}
          <div className="text-center">
            <Button 
              onClick={handleResetGame}
              variant="destructive"
              size="lg"
            >
              Start New Adventure
            </Button>
          </div>
        </>
      )}

      {/* Choice Cards */}
      {!isFinalEnding && decisionData.next && decisionData.next.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">What will you do?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {decisionData.next.map((choice) => (
                  <Card 
                key={choice.id}
                className={`cursor-pointer hover:shadow-lg transition-all ${
                  confirmedChoiceId === choice.id 
                    ? 'bg-green-50 border-green-500 shadow-green-200' 
                    : ''
                }`}
                onClick={() => !confirmedChoiceId && handleChoiceClick(choice)}
              >
                <CardHeader>
                  <CardTitle className="text-xl">{choice.decision_title}</CardTitle>
                  <CardDescription className="text-base mt-2">
                    {choice.decision_choice || choice.decision_description}
                        </CardDescription>
                    </CardHeader>
                <CardContent>
                  {confirmedChoiceId === choice.id ? (
                    <div className="flex items-center justify-center text-green-600 font-semibold">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Decision Confirmed
                    </div>
                  ) : (
                        <Button 
                      className="w-full" 
                          size="lg"
                      variant="outline"
                      disabled={!!confirmedChoiceId}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChoiceClick(choice);
                      }}
                    >
                      Choose this option →
                        </Button>
                      )}
                  </CardContent>
                </Card>
            ))}
            </div>
          </div>
        )}

      {/* Impact Display */}
      {impactData && (
        <div className="mt-8 mb-12">
          <h2 className="text-2xl font-bold mb-4">Impact of this decision:</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Health Card (Condition) */}
            {impactData.choice.condition !== 0 && (
                <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="text-3xl font-bold mb-2">
                        <span className={getStatusColor(impactData.newStats.condition)}>
                          {Math.round(impactData.newStats.condition * 100)}%
                        </span>
                      </div>
                    </div>
                    <Progress 
                      value={Math.round(impactData.newStats.condition * 100)} 
                      className="h-3"
                    />
                    {impactData.choice.condition_description && (
                      <p className="text-xs text-muted-foreground">
                        {impactData.choice.condition_description}
                      </p>
                    )}
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Morale Card */}
            {impactData.choice.morale !== 0 && (
                <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Morale</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="text-3xl font-bold mb-2">
                        <span className={getStatusColor(impactData.newStats.morale)}>
                          {Math.round(impactData.newStats.morale * 100)}%
                        </span>
                      </div>
                    </div>
                    <Progress 
                      value={Math.round(impactData.newStats.morale * 100)} 
                      className="h-3"
                    />
                    {impactData.choice.morale_description && (
                      <p className="text-xs text-muted-foreground">
                        {impactData.choice.morale_description}
                      </p>
                    )}
                    </div>
                  </CardContent>
                </Card>
              )}
            
            {/* Resources Card */}
            {impactData.choice.resources !== 0 && (
                <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Resources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="text-3xl font-bold mb-2">
                        <span className={getStatusColor(impactData.newStats.resources)}>
                          {impactData.newStats.resources}
                        </span>
                      </div>
                    </div>
                    <Progress 
                      value={(impactData.newStats.resources / 150) * 100} 
                      className="h-3"
                    />
                    {impactData.choice.resources_description && (
                      <p className="text-xs text-muted-foreground">
                        {impactData.choice.resources_description}
                      </p>
                    )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

      {/* Return to Dashboard Button */}
      <div className="mt-8">
            <Button 
              variant="outline"
              onClick={() => router.push('/')}
              className="w-full"
                size="lg"
              >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Return to Dashboard
              </Button>
          </div>

      {/* Decision Confirmation Modal */}
        <DecisionConfirmationModal
          isOpen={showNextDecisionDialog}
          onClose={() => setShowNextDecisionDialog(false)}
          onConfirm={handleConfirmDecision}
          choice={decisionData?.next?.find(c => c.id === selectedNextDecision) || null}
          isSubmitting={isLoadingNext}
          currentStats={playerStatus}
        />

        {/* Reset Game Confirmation Modal */}
        <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Your Entire Game?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete ALL your progress and settings. You will lose:
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4">
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>All decision records and story progress</li>
                <li>Your crew settings and names</li>
                <li>Your position on the leaderboard</li>
                <li>All saved game data</li>
              </ul>
              <p className="mt-4 text-sm font-semibold text-destructive">
                This action cannot be undone.
              </p>
      </div>
            <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              <AlertDialogCancel disabled={isResetting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmReset}
                disabled={isResetting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isResetting ? "Resetting..." : "Yes, Reset Everything"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  )
}