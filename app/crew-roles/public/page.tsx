"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import Image from "next/image"
import { BookOpen } from "lucide-react"
import { getStoryFromUrl, getStoryConfig } from "@/lib/story-config"
import { createApiService } from "@/lib/api-service"

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

export default function PublicCrewRolesPage() {
  const searchParams = useSearchParams()
  const currentStory = getStoryFromUrl(searchParams)
  const storyConfig = getStoryConfig(currentStory)
  
  // Get parameters from URL
  const userEmail = searchParams.get('user_email')
  const storiesIdParam = searchParams.get('stories_id')
  const storiesId = storiesIdParam ? parseInt(storiesIdParam) : 1
  
  const apiService = createApiService(currentStory, storiesId)

  const [roles, setRoles] = useState<CrewRole[]>([])
  const [loading, setLoading] = useState(true)
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [studentAssignments, setStudentAssignments] = useState<Record<string, string>>({})

  useEffect(() => {
    async function fetchData() {
      if (!userEmail) {
        setLoading(false)
        return
      }

      try {
        // Fetch roles
        const rolesData = await apiService.getRoles(storiesId)
        const sortedRoles = rolesData.sort((a: CrewRole, b: CrewRole) => (a.role_number || 0) - (b.role_number || 0))
        setRoles(sortedRoles)
        
        // Fetch user settings
        const settingsData = await apiService.getSettings(storiesId, userEmail)
        
        const userSettingsArray = Array.isArray(settingsData)
          ? settingsData.filter((setting: UserSettings) => 
              setting.email === userEmail && 
              setting.stories_id === storiesId
            )
          : (settingsData.email === userEmail && settingsData.stories_id === storiesId) ? [settingsData] : []

        if (userSettingsArray.length > 0) {
          const latestSettings = userSettingsArray.reduce((latest: UserSettings, current: UserSettings) => {
            return (current.id || 0) > (latest.id || 0) ? current : latest
          })
          
          setUserSettings(latestSettings)
          
          // Initialize student assignments from existing settings
          const assignments: Record<string, string> = {}
          for (let i = 1; i <= 12; i++) {
            const roleKey = `role_${i}` as keyof UserSettings
            const studentName = (latestSettings[roleKey] as string) || ''
            assignments[`role_${i}`] = studentName
          }
          setStudentAssignments(assignments)
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [userEmail, storiesId])

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

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-base font-semibold mb-1">Invalid Link</h3>
            <p className="text-sm text-muted-foreground">
              This crew roles page requires a valid user email parameter.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <Badge variant="outline" className="mb-4">Public View</Badge>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {userSettings?.crew_name || userEmail}'s {storyConfig.theme.terminology.crew} Roles
          </h1>
          <p className="text-muted-foreground">
            View the crew roster and student assignments for this survival story
          </p>
        </div>

        {/* Crew Info */}
        {userSettings && (
          <div className="mb-8 max-w-4xl mx-auto">
            <Card className="border shadow-sm">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  {userSettings.vessel_name && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Team Name</div>
                      <div className="font-semibold">{userSettings.vessel_name}</div>
                    </div>
                  )}
                  {userSettings.crew_name && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Crew Name</div>
                      <div className="font-semibold">{userSettings.crew_name}</div>
                    </div>
                  )}
                  {userSettings.crew_leader_name && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Crew Leader</div>
                      <div className="font-semibold">{userSettings.crew_leader_name}</div>
                    </div>
                  )}
                  {userSettings.crew_captain_name && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Crew Captain</div>
                      <div className="font-semibold">{userSettings.crew_captain_name}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <Card key={role.id} className="overflow-hidden border shadow-sm">
              <div className="aspect-video relative overflow-hidden">
                <Image
                  src={role.image || "/placeholder.svg?width=400&height=225&query=space+role"}
                  alt={role.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                
                {/* Student Name Badge */}
                {role.role_number && (() => {
                  const roleKey = typeof role.role_number === 'string' && role.role_number.startsWith('role_') 
                    ? role.role_number  
                    : `role_${role.role_number}`
                  const currentValue = studentAssignments[roleKey] || ''
                  const hasStudent = currentValue.trim() !== ''

                  return hasStudent ? (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-white text-gray-800 hover:bg-gray-50 font-mono text-sm shadow-md border border-gray-200">
                        {currentValue}
                      </Badge>
                    </div>
                  ) : (
                    <div className="absolute top-2 left-2">
                      <Badge variant="outline" className="bg-white/80 text-gray-500 font-mono text-sm">
                        Unassigned
                      </Badge>
                    </div>
                  )
                })()}
              </div>
              <CardHeader>
                <CardTitle>{role.name}</CardTitle>
                <CardDescription className="text-sm font-mono">{role.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

