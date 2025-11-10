"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import { DecisionConfirmationModal } from "@/components/decision-confirmation-modal"
import { MarkdownContent } from "@/components/markdown-content"
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

// Helper function to format relative time
function getRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`
  if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  return 'Just now'
}

// Define the structure for a decision choice
interface NextChoice {
  id?: number  // Optional - not always returned by API
  decision_id: string
  decision_title: string
  decision_description: string
  decision_choice?: string
  story?: string
  condition: number
  morale: number
  resources: number
  choice?: string
  decision_number?: number
  sequence?: number
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
}

// Define the structure for decision detail
interface DecisionDetail {
  id?: number  // Optional - not always returned by API
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

export default function DecisionPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status: sessionStatus } = useSession()
  
  // Extract stories_id from URL parameters
  const storiesIdParam = searchParams.get('stories_id')
  const storiesId = storiesIdParam ? parseInt(storiesIdParam) : 1
  
  // Check if this is a public view (no login required, read-only)
  const isPublicView = searchParams.get('public') === 'true'
  
  const [showNextDecisionDialog, setShowNextDecisionDialog] = useState(false)
  const [isLoadingNext, setIsLoadingNext] = useState(false)
  const [selectedNextDecision, setSelectedNextDecision] = useState<string | null>(null)
  const [confirmedChoiceId, setConfirmedChoiceId] = useState<string | null>(null)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [decisionData, setDecisionData] = useState<DecisionDetail | null>(null)
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>({
    morale: 0,
    resources: 0,
    condition: 0
  })
  const [loading, setLoading] = useState(true)
  const [decisionCreatedAt, setDecisionCreatedAt] = useState<number | null>(null)

  // Check if this is a historical view (has morale/resources/condition in URL)
  const urlMorale = searchParams.get('morale')
  const urlResources = searchParams.get('resources')
  const urlCondition = searchParams.get('condition')
  const isHistoricalView = !!(urlMorale || urlResources || urlCondition)

  // Get user email from session or URL params as fallback
  const sessionEmail = session?.user?.email
  const urlEmail = searchParams.get('user_email') // Add user_email to URL when navigating from home page
  const userEmail = sessionEmail || urlEmail
  const effectiveEmail = isPublicView ? 'guest' : (userEmail || 'guest')

  // Check if this is the final ending (decision_number = 6) - moved here to be available earlier
  const isFinalEnding = decisionData?.decision_number === 6 || 
    (decisionData?.next && decisionData.next.length === 0 && (decisionData?.decision_number || 0) >= 6)

  // Load story data when page mounts
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const decisionId = params.id as string
        
        // Validate decision_id
        if (!decisionId || decisionId === 'undefined' || decisionId === 'null') {
          console.error('Invalid decision_id:', decisionId)
          toast.error('Invalid decision ID. Please return to the dashboard.')
          setDecisionData(null)
          setLoading(false)
          return
        }
        
        let storyData = null
        
        // Use previous_story endpoint ONLY for current (non-historical) views
        // For historical views, go directly to stories_individual to get the correct decision
        if (!isPublicView && effectiveEmail && effectiveEmail !== 'guest' && !isHistoricalView) {
          const previousStoryUrl = `${XANO_BASE_URL}/previous_story?user_email=${encodeURIComponent(effectiveEmail)}&stories_id=${storiesId}&decision_id=${encodeURIComponent(decisionId)}`
          
          try {
            const previousResponse = await fetch(previousStoryUrl)
            if (previousResponse.ok) {
              storyData = await previousResponse.json()
              
              // Check if the API returned the correct story
              if (storyData && storyData.current_story) {
                const returnedDecisionId = storyData.current_story.decision_id
                if (returnedDecisionId !== decisionId) {
                  storyData = null
                }
              } else if (storyData && storyData.decision_id) {
                const returnedDecisionId = storyData.decision_id
                if (returnedDecisionId !== decisionId) {
                  storyData = null
                }
              }
            }
          } catch (error) {
            console.error('Error fetching previous_story:', error)
          }
        }
        
        // Fallback to stories_individual if previous_story didn't work
        if (!storyData) {
          const url = `${XANO_BASE_URL}/stories_individual?story_id_name=${encodeURIComponent(decisionId)}&stories_id=${storiesId}&user_email=${encodeURIComponent(effectiveEmail)}`
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          })
          
          if (response.ok) {
            storyData = await response.json()
          }
        }
        
        if (storyData) {
          
          // Handle different response structures
          
          // Check if this is the new structure with result1 and next_stories
          if (storyData.result1 && Array.isArray(storyData.result1) && storyData.result1.length > 0) {
            const currentStory = storyData.result1[0]
            let nextStories = storyData.next_stories || []
            
            // Flatten nested arrays - API returns [[{story1}], [{story2}]] format
            if (Array.isArray(nextStories) && nextStories.length > 0) {
              // Check if first element is an array (nested structure)
              if (Array.isArray(nextStories[0])) {
                // Flatten and extract first element from each nested array
                nextStories = nextStories.map((nested: any) => {
                  if (Array.isArray(nested) && nested.length > 0) {
                    return nested[0]
                  }
                  return nested
                }).filter((item: any) => item !== null && item !== undefined)
              }
              
              // Filter by stories_id to ensure we only show choices from the same story
              nextStories = nextStories.filter((ns: any) => ns.stories_id === storiesId)
            }
            
            const mappedDecision: DecisionDetail = {
              id: currentStory.id || 0,
              decision_id: currentStory.decision_id || decisionId,
              decision_title: currentStory.decision_title || 'Decision',
              decision_description: currentStory.decision_description || '',
              story: currentStory.story || '',
              condition: currentStory.condition || 0,
              morale: currentStory.morale || 0,
              resources: currentStory.resources || 0,
              choice: currentStory.decision_choice || '',
              decision_number: currentStory.sequence || currentStory.decision_number || 0,
              created_at: currentStory.created_at || Date.now(),
              condition_description: currentStory.condition_description || '',
              morale_description: currentStory.morale_description || '',
              resources_description: currentStory.resources_description || '',
              reflective_prompt_1: currentStory.reflective_prompt_1 || '',
              reflective_prompt_2: currentStory.reflective_prompt_2 || '',
              reflective_prompt_3: currentStory.reflective_prompt_3 || '',
              reflective_prompt_4: currentStory.reflective_prompt_4 || '',
              hero_image: currentStory.hero_image || '',
              next: nextStories
            }
            
            setDecisionData(mappedDecision)
            
            // Set player status from URL params if this is a historical view
            if (isHistoricalView) {
              setPlayerStatus({
                morale: urlMorale ? parseFloat(urlMorale) : 0,
                resources: urlResources ? parseInt(urlResources) : 0,
                condition: urlCondition ? parseFloat(urlCondition) : 0
              })
            }
          }
          // Check if this is a direct story response (from island_survival_stories/{id})
          else if (storyData.decision_id && !storyData.current_story) {
            // Extract next_stories from the story data (should be included in response)
            let nextChoices: any[] = []
            
            if (storyData._story_sequence_2 && storyData._story_sequence_2.next_stories) {
              nextChoices = Array.isArray(storyData._story_sequence_2.next_stories) 
                ? storyData._story_sequence_2.next_stories 
                : []
              
              // Flatten if nested
              if (nextChoices.length > 0 && Array.isArray(nextChoices[0])) {
                nextChoices = nextChoices.flat()
              }
            }
            
            const mappedDecision: DecisionDetail = {
              id: storyData.id || 0,
              decision_id: storyData.decision_id || decisionId,
              decision_title: storyData.decision_title || 'Decision',
              decision_description: storyData.decision_description || '',
              story: storyData.story || '',
              condition: storyData.condition || 0,
              morale: storyData.morale || 0,
              resources: storyData.resources || 0,
              choice: storyData.decision_choice || '',
              decision_number: storyData.decision_number || storyData.sequence || 0,
              created_at: storyData.created_at || Date.now(),
              condition_description: storyData.condition_description || '',
              morale_description: storyData.morale_description || '',
              resources_description: storyData.resources_description || '',
              reflective_prompt_1: storyData.reflective_prompt_1 || '',
              reflective_prompt_2: storyData.reflective_prompt_2 || '',
              reflective_prompt_3: storyData.reflective_prompt_3 || '',
              reflective_prompt_4: storyData.reflective_prompt_4 || '',
              hero_image: storyData.hero_image || '',
              next: nextChoices
            }
            
            setDecisionData(mappedDecision)
            
            // Set player status from URL params (historical view)
            if (isHistoricalView) {
              setPlayerStatus({
                morale: urlMorale ? parseFloat(urlMorale) : 0,
                resources: urlResources ? parseInt(urlResources) : 0,
                condition: urlCondition ? parseFloat(urlCondition) : 0
              })
            }
          } else if (storyData.current_story && (storyData.next_story || storyData.next_stories)) {
            // This is the active_story endpoint response
            // Handle the response structure with current_story and next_story/next_stories
            
            // current_story might be an array or object
            const currentStory = Array.isArray(storyData.current_story) 
              ? storyData.current_story[0] 
              : storyData.current_story
            
            // Handle both next_story and next_stories naming
            // next_stories might be nested arrays [[{...}], [{...}]] - flatten if needed
            let nextChoices = Array.isArray(storyData.next_story) 
              ? storyData.next_story 
              : Array.isArray(storyData.next_stories) 
                ? storyData.next_stories 
                : []
            
            // If next_stories is an array of arrays, flatten it
            if (nextChoices.length > 0 && Array.isArray(nextChoices[0])) {
              nextChoices = nextChoices.flat()
            }
            
            // Filter next_stories to only include choices for THIS decision
            // The API returns all next stories, but we only want ones that come directly after current decision
            const filteredNextChoices = nextChoices.filter((choice: any) => {
              // For START decision, we want D1_A and D1_B (decision_number = 1)
              // For D1_A decision, we want D2_AA and D2_AB (decision_number = 2)
              // So filter by: decision_number should be current + 1
              const currentDecisionNum = currentStory.decision_number || 0
              const choiceDecisionNum = choice.decision_number || parseInt(choice.decision_id.match(/\d+/)?.[0] || '0')
              return choiceDecisionNum === currentDecisionNum + 1
            })
            
            const mappedDecision: DecisionDetail = {
              id: currentStory.id || 0,
              decision_id: currentStory.decision_id || decisionId,
              decision_title: currentStory.decision_title || 'Decision',
              decision_description: currentStory.decision_description || '',
              story: currentStory.story || '',
              condition: currentStory.condition || 0,
              morale: currentStory.morale || 0,
              resources: currentStory.resources || 0,
              choice: currentStory.choice || currentStory.decision_choice || '',
              decision_number: currentStory.sequence || currentStory.decision_number || 0,
              created_at: currentStory.created_at || Date.now(),
              condition_description: currentStory.condition_description || '',
              morale_description: currentStory.morale_description || '',
              resources_description: currentStory.resources_description || '',
              reflective_prompt_1: currentStory.reflective_prompt_1 || '',
              reflective_prompt_2: currentStory.reflective_prompt_2 || '',
              reflective_prompt_3: currentStory.reflective_prompt_3 || '',
              reflective_prompt_4: currentStory.reflective_prompt_4 || '',
              hero_image: currentStory.hero_image || '',
              next: filteredNextChoices
            }
            
            setDecisionData(mappedDecision)
            
            // Set player status from score_records if available
            if (storyData.score_records && storyData.score_records.length > 0) {
              const latestScore = storyData.score_records[storyData.score_records.length - 1]
              setPlayerStatus({
                morale: latestScore.morale_after || 0,
                resources: latestScore.resources_after || 0,
                condition: latestScore.shipcondition_after || 0
              })
              setDecisionCreatedAt(latestScore.created_at)
            }
          } else if (Array.isArray(storyData)) {
            // stories_individual returned an array - filter to find the matching decision_id
            const matchingStory = storyData.find((s: any) => s.decision_id === decisionId && s.stories_id === storiesId)
            
            if (matchingStory) {
              
              // Extract next stories if available
              let nextChoices: any[] = []
              if (matchingStory.next_stories && Array.isArray(matchingStory.next_stories)) {
                nextChoices = matchingStory.next_stories
                // Flatten if nested
                if (nextChoices.length > 0 && Array.isArray(nextChoices[0])) {
                  nextChoices = nextChoices.flat()
                }
              }
              
              const mappedDecision: DecisionDetail = {
                id: matchingStory.id || 0,
                decision_id: matchingStory.decision_id || decisionId,
                decision_title: matchingStory.decision_title || 'Decision',
                decision_description: matchingStory.decision_description || '',
                story: matchingStory.story || '',
                condition: matchingStory.condition || 0,
                morale: matchingStory.morale || 0,
                resources: matchingStory.resources || 0,
                choice: matchingStory.decision_choice || '',
                decision_number: matchingStory.sequence || matchingStory.decision_number || 0,
                created_at: matchingStory.created_at || Date.now(),
                condition_description: matchingStory.condition_description || '',
                morale_description: matchingStory.morale_description || '',
                resources_description: matchingStory.resources_description || '',
                reflective_prompt_1: matchingStory.reflective_prompt_1 || '',
                reflective_prompt_2: matchingStory.reflective_prompt_2 || '',
                reflective_prompt_3: matchingStory.reflective_prompt_3 || '',
                reflective_prompt_4: matchingStory.reflective_prompt_4 || '',
                hero_image: matchingStory.hero_image || '',
                next: nextChoices
              }
              
              setDecisionData(mappedDecision)
            } else {
              console.error('No matching story found in array for decision_id:', decisionId, 'stories_id:', storiesId)
              toast.error('Story not found for this decision')
              setDecisionData(null)
            }
          } else if (storyData.id) {
            // Handle direct story object response (new structure)
            const mappedDecision: DecisionDetail = {
              id: storyData.id || 0,
              decision_id: storyData.decision_id || decisionId,
              decision_title: storyData.decision_title || 'Decision',
              decision_description: storyData.decision_description || '',
              story: storyData.story || '',
              condition: storyData.condition || 0,
              morale: storyData.morale || 0,
              resources: storyData.resources || 0,
              choice: storyData.decision_choice || '',
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
              next: [] // Will be populated from story_sequence link
            }
            
            console.log('Setting decision data from direct story:', mappedDecision)
            console.log('Full story data keys:', Object.keys(storyData))
            console.log('Looking for next choices in:', {
              _story_sequence_link: storyData._story_sequence_link,
              next_stories: storyData.next_stories,
              sequence_link: storyData.sequence_link,
              story_sequence: storyData.story_sequence
            })
            
            setDecisionData(mappedDecision)
            
            // Try to get next_story from active_story endpoint
            if (effectiveEmail && effectiveEmail !== 'guest') {
              try {
                const activeStoryUrl = `${XANO_BASE_URL}/active_story?user_email=${encodeURIComponent(effectiveEmail)}&stories_id=${storiesId}`
                const activeStoryResponse = await fetch(activeStoryUrl)
                if (activeStoryResponse.ok) {
                  const activeStoryData = await activeStoryResponse.json()
                  
                  // Handle both next_story and next_stories naming
                  let nextChoices = Array.isArray(activeStoryData.next_story) 
                    ? activeStoryData.next_story 
                    : Array.isArray(activeStoryData.next_stories) 
                      ? activeStoryData.next_stories 
                      : []
                  
                  // If next_stories is an array of arrays, flatten it
                  if (nextChoices.length > 0 && Array.isArray(nextChoices[0])) {
                    nextChoices = nextChoices.flat()
                  }
                  
                  if (nextChoices.length > 0) {
                    setDecisionData(prev => prev ? { ...prev, next: nextChoices } : null)
                  }
                  
                  // Get created_at from score_records
                  if (activeStoryData.score_records && activeStoryData.score_records.length > 0) {
                    const latestScore = activeStoryData.score_records[activeStoryData.score_records.length - 1]
                    setDecisionCreatedAt(latestScore.created_at)
                  }
                }
              } catch (error) {
                console.error('Error fetching active_story for next choices:', error)
              }
            }
            
            // Set player status from URL params if this is a historical view
            if (isHistoricalView) {
              setPlayerStatus({
                morale: urlMorale ? parseFloat(urlMorale) : 0,
                resources: urlResources ? parseInt(urlResources) : 0,
                condition: urlCondition ? parseFloat(urlCondition) : 0
              })
              console.log('Set historical player status from URL:', { urlMorale, urlResources, urlCondition })
            } else if (storyData.morale !== undefined) {
              setPlayerStatus({
                morale: storyData.morale || 0,
                resources: storyData.resources || 0,
                condition: storyData.condition || 0
              })
            }
          } else {
            // Fallback to direct mapping if structure is different
            console.log('Using direct story data mapping')
            
            const mappedDecision: DecisionDetail = {
              id: storyData.id || 0,
              decision_id: storyData.decision_id || decisionId,
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
            if (isHistoricalView) {
              setPlayerStatus({
                morale: urlMorale ? parseFloat(urlMorale) : 0,
                resources: urlResources ? parseInt(urlResources) : 0,
                condition: urlCondition ? parseFloat(urlCondition) : 0
              })
              console.log('Set historical player status from URL:', { urlMorale, urlResources, urlCondition })
            } else {
              setPlayerStatus({
                morale: storyData.morale || 0,
                resources: storyData.resources || 0,
                condition: storyData.condition || 0
              })
            }
          }
        } else {
          console.error('Failed to load story data - no matching story structure found')
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
      if (!decisionData || !userEmail || userEmail === 'guest' || isPublicView) return

      try {
        // Fetch all score records for this user and story
        const scoresUrl = `${XANO_BASE_URL}/island_survival_score?user_email=${encodeURIComponent(userEmail)}&stories_id=${storiesId}`
        const scoresResponse = await fetch(scoresUrl)
        
        if (scoresResponse.ok) {
          const scoresData = await scoresResponse.json()
          
          if (Array.isArray(scoresData) && scoresData.length > 0) {
            // Find a record where the previous_decision matches this story's decision_id
            const nextDecisionRecord = scoresData.find((record: any) => 
              record.previous_decision === decisionData.decision_id && 
              record.stories_id === storiesId
            )
            
            if (nextDecisionRecord) {
              // Find which choice matches the next decision_id
              const matchingChoice = decisionData.next.find(choice => 
                choice.decision_id === nextDecisionRecord.decision_id
              )
              
              if (matchingChoice) {
                setConfirmedChoiceId(matchingChoice.decision_id)
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking for completed decision:', error)
      }
    }

    checkCompletedDecision()
  }, [decisionData, userEmail, storiesId, isPublicView])


  const handleChoiceClick = (choice: NextChoice) => {
    setSelectedNextDecision(choice.decision_id)
    setShowNextDecisionDialog(true)
  }

  const handleConfirmDecision = async () => {
    if (!selectedNextDecision || !decisionData) {
      console.error('Missing required data for decision')
      return
    }
    
    setIsLoadingNext(true)
    
    try {
      // Find the selected choice by decision_id
      const selectedChoice = decisionData.next.find(c => c.decision_id === selectedNextDecision)
      if (!selectedChoice) {
        throw new Error('Selected choice not found')
      }

      // Calculate new stats with proper capping
      const newStats: PlayerStatus = {
        morale: Math.max(0, Math.min(1, playerStatus.morale + (selectedChoice.morale || 0))),
        resources: Math.max(0, playerStatus.resources + (selectedChoice.resources || 0)), // No upper limit for resources
        condition: Math.max(0, Math.min(1, playerStatus.condition + (selectedChoice.condition || 0)))
      }
      
      // Save the score to track user's decision
      if (effectiveEmail && effectiveEmail !== 'guest' && userEmail) {
        try {
          // Get the numeric story ID - fetch if needed
          let storyId = selectedChoice.id
          
          if (!storyId) {
            try {
              const storyLookupResponse = await fetch(
                `${XANO_BASE_URL}/stories_individual?decision_id=${encodeURIComponent(selectedChoice.decision_id)}&stories_id=${storiesId}`
              )
              if (storyLookupResponse.ok) {
                const storyLookupData = await storyLookupResponse.json()
                
                // Handle array response
                if (Array.isArray(storyLookupData)) {
                  const matchingStory = storyLookupData.find((s: any) => 
                    s.decision_id === selectedChoice.decision_id && s.stories_id === storiesId
                  )
                  storyId = matchingStory?.id
                } else {
                  storyId = storyLookupData.id || storyLookupData.current_story?.id
                }
              }
            } catch (lookupError) {
              console.error('Error looking up story ID:', lookupError)
            }
          }
          
          if (!storyId) {
            console.error('Could not determine story ID for decision:', selectedChoice)
            toast.error('Cannot save decision - unable to find story ID.')
            setIsLoadingNext(false)
            return
          }
          
          const scorePayload = {
            id: storyId, // The numeric story ID (required)
            decision_id: selectedChoice.decision_id,
            email: userEmail,
            previous_decision: decisionData.decision_id || '',
            decision_number: selectedChoice.decision_number || selectedChoice.sequence || 0,
            stories_id: storiesId
          }
          
          const scoreResponse = await fetch(`${XANO_BASE_URL}/island_survival_score`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(scorePayload)
          })
          
          if (!scoreResponse.ok) {
            const errorText = await scoreResponse.text()
            console.error('Failed to save score:', scoreResponse.status, errorText)
            toast.error('Failed to save your decision. Please try again.')
            throw new Error('Score save failed')
          } else {
            await scoreResponse.json()
            toast.success('Decision saved!')
          }
        } catch (error) {
          console.error('Error posting score:', error)
          // Don't continue if score save fails
          setIsLoadingNext(false)
          return
        }
      } else {
        toast.info('Decision recorded (login to save progress)')
      }

      // Update player status
      setPlayerStatus(newStats)
      
      // Mark the choice as confirmed (turn it green)
      setConfirmedChoiceId(selectedChoice.decision_id)
      
      // Close dialog
      setShowNextDecisionDialog(false)
      
      // Show notification
      toast.success('Decision confirmed!')
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
      router.push(`/story/${storiesId}`)
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
    if (!userEmail || userEmail === 'guest') {
      toast.error("Cannot reset - user not authenticated")
      return
    }
    
    setIsResetting(true)
    
    // Immediately navigate to story dashboard and close dialog
    setShowResetDialog(false)
    router.push(`/story/${storiesId}`)
    
    try {
            // Perform reset operations in the background
      // First, get all user's score records to delete them
      const scoresResponse = await fetch(`${XANO_BASE_URL}/user_all_scores?user_email=${encodeURIComponent(userEmail)}&stories_id=${storiesId}`)
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
      const settingsResponse = await fetch(`${XANO_BASE_URL}/story_settings?stories_id=${storiesId}`)
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json()
        if (Array.isArray(settingsData)) {
          // Delete each settings record for this user
          for (const setting of settingsData) {
            if (setting.email === userEmail) {
              const deleteSettingsResponse = await fetch(`${XANO_BASE_URL}/story_settings/${setting.id}`, {
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
      
      // Force a page reload after a short delay to ensure create_new_story runs
      setTimeout(() => {
        window.location.reload()
      }, 2000)
      
    } catch (error) {
      console.error('Error resetting game:', error)
      toast.error('Failed to reset game. Please try again.')
    } finally {
      setIsResetting(false)
    }
  }

  if (loading || sessionStatus === 'loading' || !decisionData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Spinner className="h-8 w-8 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading decision...</p>
        </div>
      </div>
    )
  }

  if (!decisionData) {
    const decisionId = params.id as string
    const isInvalidId = !decisionId || decisionId === 'undefined' || decisionId === 'null'
    
    return (
      <div className="container mx-auto p-6 max-w-6xl">
          <Card>
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              {isInvalidId ? 'Invalid Story ID' : 'Story Not Found'}
            </h2>
            <p className="text-gray-600 mb-4">
              {isInvalidId 
                ? 'The decision ID provided is not valid.'
                : 'The requested story could not be found.'}
            </p>
            <p className="text-sm text-gray-500 mb-6">Decision ID: {params.id}</p>
            <Button 
              onClick={() => router.push(`/story/${storiesId}`)}
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
    nextChoicesData: decisionData.next,
    isFinalEnding,
    isPublicView,
    isHistoricalView
  })

  // Show login prompt if user is not authenticated
  const showLoginPrompt = sessionStatus === 'unauthenticated'

  return (
    <div className="container mx-auto p-6 max-w-6xl print:p-0 print:max-w-none">
      {/* Print-only title */}
      {decisionData.hero_image && (
        <div className="hidden print:block mb-6 mt-8">
          <div className="flex items-center gap-2 mb-2">
            {decisionData.decision_number > 0 && (
              <span className="text-xs font-medium">Decision {decisionData.decision_number}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold mb-4">{decisionData.decision_title}</h1>
        </div>
      )}
      
          {/* Hero Image */}
      {decisionData.hero_image && (
        <div className="relative w-full h-64 md:h-96 mb-6 rounded-lg overflow-hidden print:hidden">
          <img 
            src={decisionData.hero_image} 
            alt={decisionData.decision_title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          {/* Buttons on top of image - hide in public view and print */}
          {!isPublicView && (
            <div className="absolute top-4 left-0 right-0 flex justify-between px-4 print:hidden">
                <Button 
                  variant="secondary" 
                size="sm"
                  onClick={() => router.push(`/story/${storiesId}`)}
                className="bg-white/90 hover:bg-white text-black"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Return to Dashboard
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => {
                      const publicUrl = `${window.location.origin}/decision/${encodeURIComponent(decisionData.decision_id)}?stories_id=${storiesId}&public=true`
                      navigator.clipboard.writeText(publicUrl)
                      toast.success('Public link copied to clipboard!')
                    }}
                    className="bg-white/90 hover:bg-white text-black"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Link
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
            </div>
          )}
          
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white print:hidden">
            <div className="flex items-center gap-3 mb-2">
              {decisionData.decision_number > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Decision {decisionData.decision_number}
                </Badge>
              )}
              {decisionCreatedAt && !isPublicView && (
                <Badge variant="outline" className="text-xs border-white/50 text-white">
                  {getRelativeTime(decisionCreatedAt)}
                </Badge>
              )}
            </div>
            <h1 className="text-4xl font-bold mb-2">{decisionData.decision_title}</h1>
            {decisionData.decision_description && (
              <div className="text-xl opacity-90">
                <MarkdownContent content={decisionData.decision_description} className="prose-invert" />
              </div>
            )}
                </div>
              </div>
              )}

      {/* Buttons when no hero image - hide in public view */}
      {!decisionData.hero_image && !isPublicView && (
        <div className="flex justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/story/${storiesId}`)}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Return to Dashboard
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                const publicUrl = `${window.location.origin}/decision/${encodeURIComponent(decisionData.decision_id)}?stories_id=${storiesId}&public=true`
                navigator.clipboard.writeText(publicUrl)
                toast.success('Public link copied to clipboard!')
              }}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Link
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
                        </div>
                      )}

      {/* Main Story Card */}
      <Card className="mb-6 print:border-0 print:shadow-none">
        {!decisionData.hero_image && (
          <CardHeader className="print:px-0">
            <div className="flex items-center gap-2 mb-2 print:hidden">
              {decisionData.decision_number > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Decision {decisionData.decision_number}
                </Badge>
              )}
              {decisionCreatedAt && !isPublicView && (
                <Badge variant="outline" className="text-xs">
                  {getRelativeTime(decisionCreatedAt)}
                </Badge>
              )}
            </div>
            <CardTitle className="text-3xl font-bold print:text-2xl print:mb-4">
                {decisionData.decision_title}
                  </CardTitle>
            {decisionData.decision_description && (
              <div className="text-lg mt-2 text-muted-foreground print:hidden">
                <MarkdownContent content={decisionData.decision_description} />
              </div>
                      )}
                    </CardHeader>
        )}
                <CardContent className="p-6 print:px-0 print:py-0">
              <MarkdownContent content={decisionData.story} />
                    </CardContent>
                  </Card>


      {/* Final Ending Message - hide in public view */}
      {!isPublicView && isFinalEnding && (
        <>
          <Card className="mb-6 print:hidden">
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


          {/* Reset Button */}
          <Card className="mb-6 print:hidden border-2 border-primary">
            <CardContent className="text-center py-8">
              <h3 className="text-xl font-semibold mb-4">Ready for a New Journey?</h3>
              <p className="text-muted-foreground mb-6">
                Start over and make different choices to see where they lead.
              </p>
              <Button 
                onClick={handleResetGame}
                variant="default"
                size="lg"
                className="px-8"
              >
                Start New Adventure
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* No More Choices - Show Reset Option */}
      {!isPublicView && !isFinalEnding && decisionData.next && decisionData.next.length === 0 && (
        <Card className="mb-6 print:hidden">
          <CardContent className="text-center py-12">
            <h2 className="text-xl font-bold mb-4">End of This Path</h2>
            <p className="text-muted-foreground mb-6">
              You've reached the end of this story path. Start a new adventure to explore different choices!
            </p>
            <Button 
              onClick={handleResetGame}
              variant="default"
              size="lg"
            >
              Start New Adventure
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Choice Cards - hide in public view */}
      {!isFinalEnding && !isPublicView && decisionData.next && decisionData.next.length > 0 && (
        <div className="print:hidden">
          <h2 className="text-2xl font-bold mb-4">What will you do?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {decisionData.next.map((choice) => (
              <Card
                key={choice.decision_id}
                className={`cursor-pointer hover:shadow-lg transition-all ${
                  confirmedChoiceId === choice.decision_id 
                    ? 'bg-green-50 border-green-500 shadow-green-200' 
                    : ''
                }`}
                onClick={() => !confirmedChoiceId && handleChoiceClick(choice)}
              >
                <CardHeader>
                  <CardTitle className="text-xl">{choice.decision_title}</CardTitle>
                  <div className="text-base mt-2 text-muted-foreground">
                    <MarkdownContent content={
                      choice.decision_choice || 
                      choice.decision_description || 
                      choice.story_summary || 
                      choice.result_summary || 
                      'No content available'
                    } />
                  </div>
                    </CardHeader>
                <CardContent>
                  {confirmedChoiceId === choice.decision_id ? (
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


      {/* Return to Dashboard Button - hide in public view */}
      {!isPublicView && (
        <div className="mt-8 print:hidden">
              <Button 
                variant="outline"
                onClick={() => router.push(`/story/${storiesId}`)}
                className="w-full"
                  size="lg"
                >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Return to Dashboard
                </Button>
            </div>
      )}

      {/* Decision Confirmation Modal */}
        <DecisionConfirmationModal
          isOpen={showNextDecisionDialog}
          onClose={() => setShowNextDecisionDialog(false)}
          onConfirm={handleConfirmDecision}
          choice={(decisionData?.next?.find(c => c.decision_id === selectedNextDecision) as any) || null}
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