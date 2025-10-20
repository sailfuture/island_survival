"use client"

import { useState, useEffect, type FormEvent, type ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useCurrentUser } from "@/hooks/use-current-user"

const XANO_BASE_URL = "https://xsc3-mvx7-r86m.n7e.xano.io/api:7l5S8ZC7"

interface UserSettings {
  id: number
  created_at?: number
  email: string
  crew_leader_name: string
  crew_name: string
  crew_captain_name: string
  vessel_name: string
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

interface SettingsFormState {
  vesselName: string
  crewName: string
  crewLeaderName: string
  crewCaptainName: string
}

const initialFormState: SettingsFormState = {
  vesselName: "",
  crewName: "",
  crewLeaderName: "",
  crewCaptainName: "",
}

interface SettingsFormProps {
  onFormSubmitSuccess: () => void
  storiesId: number
}

export function SettingsForm({ onFormSubmitSuccess, storiesId }: SettingsFormProps) {
  const [formState, setFormState] = useState<SettingsFormState>(initialFormState)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingSettings, setIsFetchingSettings] = useState(false)
  const [currentUserSettings, setCurrentUserSettings] = useState<UserSettings | null>(null)
  const { email: userEmail } = useCurrentUser()
  
  useEffect(() => {
    async function fetchSettings() {
      if (!userEmail || !storiesId) return
      
      setIsFetchingSettings(true)
      try {
        const response = await fetch(
          `${XANO_BASE_URL}/island_survival_settings?stories_id=${storiesId}&user_email=${encodeURIComponent(userEmail)}`
        )
        if (response.ok) {
          const data = await response.json()
          console.log('Settings data fetched:', data)
          
          // The API should return filtered data, but add client-side filtering as safety measure
          const userSettings = Array.isArray(data) 
            ? data.filter((s: any) => s.email === userEmail && s.stories_id === storiesId)
            : (data.id && data.email === userEmail && data.stories_id === storiesId) ? [data] : []
          
          console.log('Filtered user settings for', userEmail, 'story', storiesId, ':', userSettings)
          
          if (userSettings.length > 0) {
            // Get the most recent entry
            const latestSettings = userSettings.reduce((latest, current) => {
              return (current.created_at || 0) > (latest.created_at || 0) ? current : latest
            })
            
            console.log('Using latest settings:', latestSettings)
            setCurrentUserSettings(latestSettings)
            
            // Populate form with existing data
            setFormState({
              vesselName: latestSettings.vessel_name || "",
              crewName: latestSettings.crew_name || "",
              crewLeaderName: latestSettings.crew_leader_name || "",
              crewCaptainName: latestSettings.crew_captain_name || "",
            })
          } else {
            console.log('No existing settings found for user')
            setCurrentUserSettings(null)
            setFormState(initialFormState)
          }
        } else {
          console.error('Failed to fetch settings:', response.status, response.statusText)
          setFormState(initialFormState)
        }
      } catch (error) {
        console.error("Error fetching settings:", error)
        toast.error("Could not load existing settings.")
        setFormState(initialFormState)
      } finally {
        setIsFetchingSettings(false)
      }
    }
    
    if (userEmail) {
      fetchSettings()
    }
  }, [userEmail, storiesId])

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (value: string) => {
    setFormState((prev) => ({ ...prev, crewName: value }))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (!userEmail) {
        toast.error("Please log in to save settings.")
        return
      }

      const updatePayload = {
        island_survival_settings_id: currentUserSettings?.id || 0,
        email: userEmail,
        crew_leader_name: formState.crewLeaderName,
        crew_name: formState.crewName,
        crew_captain_name: formState.crewCaptainName,
        vessel_name: formState.vesselName,
        stories_id: storiesId,
        // Preserve existing role assignments
        role_1: currentUserSettings?.role_1 || '',
        role_2: currentUserSettings?.role_2 || '',
        role_3: currentUserSettings?.role_3 || '',
        role_4: currentUserSettings?.role_4 || '',
        role_5: currentUserSettings?.role_5 || '',
        role_6: currentUserSettings?.role_6 || '',
        role_7: currentUserSettings?.role_7 || '',
        role_8: currentUserSettings?.role_8 || '',
        role_9: currentUserSettings?.role_9 || '',
        role_10: currentUserSettings?.role_10 || '',
        role_11: currentUserSettings?.role_11 || '',
        role_12: currentUserSettings?.role_12 || '',
      }

      console.log('Settings form - UPDATE payload:', updatePayload)
      
      const url = currentUserSettings?.id 
        ? `${XANO_BASE_URL}/island_survival_settings/${currentUserSettings.id}`
        : `${XANO_BASE_URL}/island_survival_settings`
      
      const method = currentUserSettings?.id ? 'PATCH' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to ${method} settings: ${response.status}`)
      }
      
      const updatedSettings = await response.json()
      console.log('Settings updated successfully:', updatedSettings)
      toast.success("Settings updated successfully!")
      onFormSubmitSuccess()
      
      // Refresh the page to update all settings data
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error("Error submitting settings:", error)
      toast.error("Could not submit settings.")
    } finally {
      setIsLoading(false)
    }
  }

  const crewOptions = ["Crew A", "Crew B", "Crew C", "Crew D", "Crew E"]

  if (isFetchingSettings) {
    return (
      <div className="p-6 text-center font-mono">
        <div className="text-sm text-muted-foreground">Loading settings...</div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 px-1 py-2 max-h-[70vh] overflow-y-auto">
      <div className="space-y-2">
        <Label htmlFor="vesselName">Survival Tribe Name</Label>
        <Input
          id="vesselName"
          name="vesselName"
          value={formState.vesselName}
          onChange={handleInputChange}
          placeholder="e.g., The Island Survivors"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="crewName">Select Crew</Label>
        <Select name="crewName" onValueChange={handleSelectChange} value={formState.crewName} required>
          <SelectTrigger id="crewName">
            <SelectValue placeholder="Choose your crew" />
          </SelectTrigger>
          <SelectContent>
            {crewOptions.map((crewName) => (
              <SelectItem key={crewName} value={crewName}>
                {crewName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="crewLeaderName">Crew Leader Name</Label>
        <Input
          id="crewLeaderName"
          name="crewLeaderName"
          value={formState.crewLeaderName}
          onChange={handleInputChange}
          placeholder="e.g., Captain Rex"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="crewCaptainName">Crew Captain Name</Label>
        <Input
          id="crewCaptainName"
          name="crewCaptainName"
          value={formState.crewCaptainName}
          onChange={handleInputChange}
          placeholder="e.g., First Mate Anya"
          required
        />
      </div>
      
      <Button type="submit" className="w-full" disabled={isLoading || isFetchingSettings}>
        {isLoading ? "Saving..." : currentUserSettings ? "Update Settings" : "Save Settings"}
      </Button>
    </form>
  )
}