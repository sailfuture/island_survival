"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Image from "next/image"
import { toast } from "sonner"
import { useCurrentUser } from "@/hooks/use-current-user"
import { Edit, Check, X } from "lucide-react"
import { getStoryFromUrl, getStoryConfig } from "@/lib/story-config"
import { createApiService } from "@/lib/api-service"
import { Spinner } from "@/components/ui/spinner"

interface CrewRole {
  id: number
  name: string
  description: string
  bonus: string
  bonus_value: number
  penalty: string
  penalty_value: number
  role: string
  tools: string
  image: string
  role_number: number
}

interface UserSettings {
  id?: number
  email: string
  vessel_name: string
  crew_name: string
  crew_leader_name: string
  crew_captain_name: string
  stories_id: number
  role_1?: string
  role_2?: string
  role_3?: string
  role_4?: string
  role_5?: string
  role_6?: string
  role_7?: string
  role_8?: string
  role_9?: string
  role_10?: string
  role_11?: string
  role_12?: string
}

// Remove hardcoded XANO_BASE_URL - now using dynamic API service

export default function CrewRolesPage() {
  const searchParams = useSearchParams()
  const currentStory = getStoryFromUrl(searchParams)
  const storyConfig = getStoryConfig(currentStory)
  
  // Get stories_id from URL params
  const storiesIdParam = searchParams.get('stories_id')
  const storiesId = storiesIdParam ? parseInt(storiesIdParam) : 1
  
  const apiService = createApiService(currentStory, storiesId)

  const [roles, setRoles] = useState<CrewRole[]>([])
  const [loading, setLoading] = useState(true)
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [studentAssignments, setStudentAssignments] = useState<Record<string, string>>({})
  const [assignmentDialog, setAssignmentDialog] = useState<{
    isOpen: boolean
    roleKey: string
    roleName: string
    currentValue: string
  }>({
    isOpen: false,
    roleKey: '',
    roleName: '',
    currentValue: ''
  })
  const [tempStudentName, setTempStudentName] = useState('')
  const { email: userEmail } = useCurrentUser()

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch roles
        console.log('Fetching roles for story:', currentStory, 'stories_id:', storiesId)
        const rolesData = await apiService.getRoles(storiesId)
        // Sort roles by role_number for proper ordering
        const sortedRoles = rolesData.sort((a: CrewRole, b: CrewRole) => (a.role_number || 0) - (b.role_number || 0))
        console.log('🎯 Roles loaded with role_numbers:', sortedRoles.map(r => ({
          id: r.id,
          name: r.name,
          role_number: r.role_number
        })))
        setRoles(sortedRoles)
        
        // Fetch user settings if user is logged in
        if (userEmail) {
          console.log('🔍 Fetching settings for user:', userEmail, 'stories_id:', storiesId)
          const settingsData = await apiService.getSettings(storiesId, userEmail)
          console.log('🔍 Raw settings response:', settingsData)
          console.log('🔍 Is array?', Array.isArray(settingsData))
          
          // Find current user's settings - filter by both email AND stories_id
          const userSettingsArray = Array.isArray(settingsData)
            ? settingsData.filter((setting: UserSettings) => 
                setting.email === userEmail && 
                setting.stories_id === storiesId
              )
            : (settingsData.email === userEmail && settingsData.stories_id === storiesId) ? [settingsData] : []
          
          console.log('🔍 Filtered settings count:', userSettingsArray.length)
          console.log('🔍 Filtered settings:', userSettingsArray)

          if (userSettingsArray.length > 0) {
            const latestSettings = userSettingsArray.reduce((latest: UserSettings, current: UserSettings) => {
              return (current.id || 0) > (latest.id || 0) ? current : latest
            })
            
            console.log('✅ Found user settings:', {
              id: latestSettings.id,
              email: latestSettings.email,
              stories_id: latestSettings.stories_id,
              role_fields: Object.keys(latestSettings).filter(k => k.startsWith('role_'))
            })
            
            // Log all role values
            console.log('📋 Role values from database:')
            for (let i = 1; i <= 12; i++) {
              const roleKey = `role_${i}` as keyof UserSettings
              const value = latestSettings[roleKey]
              console.log(`  role_${i}: "${value}"`)
            }
            
            setUserSettings(latestSettings)
            
            // Initialize student assignments from existing settings
            const assignments: Record<string, string> = {}
            for (let i = 1; i <= 12; i++) {
              const roleKey = `role_${i}` as keyof UserSettings
              const studentName = (latestSettings[roleKey] as string) || ''
              assignments[`role_${i}`] = studentName
            }
            setStudentAssignments(assignments)
            
            console.log('✅ Student assignments initialized with', Object.entries(assignments).filter(([k, v]) => v.trim() !== '').length, 'assigned students')
            console.log('📋 Assigned students:', Object.entries(assignments)
              .filter(([k, v]) => v.trim() !== '')
              .map(([k, v]) => `${k}: ${v}`)
            )
          } else {
            console.log('No user settings found for:', userEmail)
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [userEmail, currentStory, storiesId])

  const handleStudentAssignment = (roleNumber: number, studentName: string) => {
    // Fix the key generation - ensure we only have one "role_" prefix
    const roleKey = typeof roleNumber === 'string' && roleNumber.startsWith('role_') 
      ? roleNumber  // Already has role_ prefix
      : `role_${roleNumber}` // Add role_ prefix
    
    console.log(`🎯 Input change: ${roleKey} = "${studentName}" (raw roleNumber: ${roleNumber})`)
    setStudentAssignments(prev => {
      const updated = {
        ...prev,
        [roleKey]: studentName
      }
      console.log(`🎯 Updated studentAssignments:`, updated)
      return updated
    })
  }

  const openAssignmentDialog = (roleKey: string, roleName: string) => {
    const currentValue = studentAssignments[roleKey] || ''
    setAssignmentDialog({
      isOpen: true,
      roleKey,
      roleName,
      currentValue
    })
    setTempStudentName(currentValue)
  }

  const closeAssignmentDialog = () => {
    setAssignmentDialog({
      isOpen: false,
      roleKey: '',
      roleName: '',
      currentValue: ''
    })
    setTempStudentName('')
  }

  const confirmAssignment = async () => {
    if (!assignmentDialog.roleKey || !userEmail || !userSettings?.id) {
      toast.error("Unable to save assignment")
      return
    }

    try {
      // Update local state first
      setStudentAssignments(prev => ({
        ...prev,
        [assignmentDialog.roleKey]: tempStudentName
      }))
      
      closeAssignmentDialog()
      
      // Save immediately to database
      toast.success("Saving assignment to database...")
      
      // Create payload with all current assignments plus the new one
      const currentAssignments = { ...studentAssignments, [assignmentDialog.roleKey]: tempStudentName }
      
      const updatePayload = {
        user_email: userEmail,
        crew_leader_name: userSettings.crew_leader_name || '',
        crew_name: userSettings.crew_name || '',
        crew_captain_name: userSettings.crew_captain_name || '',
        vessel_name: userSettings.vessel_name || '',
        island_survival_settings_id: userSettings.id,
        stories_id: storiesId,
        // Include all role assignments
        role_1: currentAssignments.role_1 || '',
        role_2: currentAssignments.role_2 || '',
        role_3: currentAssignments.role_3 || '',
        role_4: currentAssignments.role_4 || '',
        role_5: currentAssignments.role_5 || '',
        role_6: currentAssignments.role_6 || '',
        role_7: currentAssignments.role_7 || '',
        role_8: currentAssignments.role_8 || '',
        role_9: currentAssignments.role_9 || '',
        role_10: currentAssignments.role_10 || '',
        role_11: currentAssignments.role_11 || '',
        role_12: currentAssignments.role_12 || '',
      }

      console.log('💾 Saving assignment to database...')
      console.log('💾 Payload:', updatePayload)
      console.log('💾 Non-empty roles:', Object.entries(currentAssignments)
        .filter(([k, v]) => v.trim() !== '')
        .map(([k, v]) => `${k}: ${v}`)
      )

      const updatedSettings = await apiService.updateSettingsGeneral(updatePayload)
      setUserSettings(updatedSettings)
      toast.success("Assignment saved successfully!")
      console.log('✅ Save response:', updatedSettings)
    } catch (error) {
      console.error('Error saving assignment:', error)
      toast.error('Failed to save assignment. Please try again.')
    }
  }

  const removeAssignment = async () => {
    if (!assignmentDialog.roleKey || !userEmail || !userSettings?.id) {
      toast.error("Unable to remove assignment")
      return
    }

    try {
      // Update local state first
      setStudentAssignments(prev => ({
        ...prev,
        [assignmentDialog.roleKey]: ''
      }))
      
      closeAssignmentDialog()
      
      // Save removal to database immediately
      toast.success("Removing assignment from database...")
      
      // Create payload with all current assignments minus the removed one
      const currentAssignments = { ...studentAssignments, [assignmentDialog.roleKey]: '' }
      
      const updatePayload = {
        user_email: userEmail,
        crew_leader_name: userSettings.crew_leader_name || '',
        crew_name: userSettings.crew_name || '',
        crew_captain_name: userSettings.crew_captain_name || '',
        vessel_name: userSettings.vessel_name || '',
        island_survival_settings_id: userSettings.id,
        stories_id: storiesId,
        // Include all role assignments
        role_1: currentAssignments.role_1 || '',
        role_2: currentAssignments.role_2 || '',
        role_3: currentAssignments.role_3 || '',
        role_4: currentAssignments.role_4 || '',
        role_5: currentAssignments.role_5 || '',
        role_6: currentAssignments.role_6 || '',
        role_7: currentAssignments.role_7 || '',
        role_8: currentAssignments.role_8 || '',
        role_9: currentAssignments.role_9 || '',
        role_10: currentAssignments.role_10 || '',
        role_11: currentAssignments.role_11 || '',
        role_12: currentAssignments.role_12 || '',
      }

      console.log('🗑️ Removing assignment from database...')
      console.log('🗑️ Payload:', updatePayload)

      const updatedSettings = await apiService.updateSettingsGeneral(updatePayload)
      setUserSettings(updatedSettings)
      toast.success("Assignment removed successfully!")
      console.log('✅ Remove response:', updatedSettings)
    } catch (error) {
      console.error('Error removing assignment:', error)
      toast.error('Failed to remove assignment. Please try again.')
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Spinner className="h-8 w-8 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading crew roles...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">{storyConfig.theme.terminology.crew} Roles & Student Assignments</h1>
          <p className="text-muted-foreground">
            Assign students to each survival role. Each role has unique bonuses and penalties that affect the story.
          </p>
        </div>


        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <Card key={role.id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
              <div className="aspect-video relative overflow-hidden">
                <Image
                  src={role.image || "/placeholder.svg?width=400&height=225&query=space+role"}
                  alt={role.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                
                {/* Student Name Badge */}
                {userEmail && role.role_number && (() => {
                  const roleKey = typeof role.role_number === 'string' && role.role_number.startsWith('role_') 
                    ? role.role_number  
                    : `role_${role.role_number}`
                  const currentValue = studentAssignments[roleKey] || ''
                  const hasStudent = currentValue.trim() !== ''

                  // Debug badge display
                  if (process.env.NODE_ENV === 'development') {
                    console.log(`🏷️ Badge for ${role.name}: roleKey=${roleKey}, value="${currentValue}", hasStudent=${hasStudent}`)
                  }

                  return hasStudent ? (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-white text-gray-800 hover:bg-gray-50 font-mono text-sm shadow-md border border-gray-200">
                        {currentValue}
                      </Badge>
                    </div>
                  ) : null
                })()}
              </div>
              <CardHeader>
                <CardTitle>{role.name}</CardTitle>
                <CardDescription className="text-sm font-mono">{role.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-grow">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground font-mono mb-1">{role.role}</p>
                </div>

                <div className="space-y-2">
                  <Badge className="font-mono text-xs bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-700 dark:text-green-100 dark:hover:bg-green-600 inline-flex">
                    {role.bonus}: +{role.bonus_value}
                  </Badge>
                  <Badge
                    variant="destructive"
                    className="font-mono text-xs bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-700 dark:text-red-100 dark:hover:bg-red-600 inline-flex"
                  >
                    {role.penalty}: -{role.penalty_value}
                  </Badge>
                </div>

                <div className="pt-2 border-t">
                  <h4 className="text-sm font-medium mb-2 font-mono">Equipment</h4>
                  <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 font-mono">
                    {role.tools
                      .split(",")
                      .map((tool) => tool.trim())
                      .filter((tool) => tool)
                      .map((tool, index) => (
                        <li key={index}>{tool}</li>
                      ))}
                  </ul>
                </div>

                {/* Spacer to push button to bottom */}
                <div className="flex-1"></div>
                
                {/* Student Assignment Button */}
                {userEmail && role.role_number && (() => {
                  const roleKey = typeof role.role_number === 'string' && role.role_number.startsWith('role_') 
                    ? role.role_number  
                    : `role_${role.role_number}`
                  const currentValue = studentAssignments[roleKey] || ''
                  const hasStudent = currentValue.trim() !== ''

                  return (
                    <div className="pt-4 border-t">
                      <Button
                        type="button"
                        variant={hasStudent ? "outline" : "default"}
                        size="sm"
                        onClick={() => openAssignmentDialog(roleKey, role.name)}
                        className="w-full"
                      >
                        {hasStudent ? (
                          <>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Assignment
                          </>
                        ) : (
                          "Assign Student"
                        )}
                      </Button>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Student Assignment Dialog */}
        <Dialog open={assignmentDialog.isOpen} onOpenChange={closeAssignmentDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {assignmentDialog.currentValue ? 'Edit Assignment' : 'Assign Student'}
              </DialogTitle>
              <DialogDescription>
                {assignmentDialog.currentValue 
                  ? `Update the student assignment for ${assignmentDialog.roleName}`
                  : `Assign a student to the ${assignmentDialog.roleName} role`
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="student-name">Student Name</Label>
                <Input
                  id="student-name"
                  placeholder="Enter student name"
                  value={tempStudentName}
                  onChange={(e) => setTempStudentName(e.target.value)}
                  className="mt-2"
                  autoFocus
                />
              </div>
            </div>

            <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              {assignmentDialog.currentValue && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={removeAssignment}
                  className="w-full sm:w-auto"
                >
                  Remove Assignment
                </Button>
              )}
              <div className="flex space-x-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeAssignmentDialog}
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={confirmAssignment}
                  disabled={!tempStudentName.trim()}
                  className="flex-1 sm:flex-none bg-black hover:bg-gray-800 text-white"
                >
                  {assignmentDialog.currentValue ? 'Update' : 'Assign'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
