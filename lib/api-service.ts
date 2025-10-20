import { buildApiUrl, buildApiUrlWithQuery, getStoryConfig, type StoryType } from './story-config'

export class ApiService {
  constructor(private storyType: StoryType, private storiesId?: number) {}

  // Story endpoints
  async getStory(storyId: string | number) {
    const url = buildApiUrl(this.storyType, 'stories', storyId)
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch story: ${response.status}`)
    }
    return response.json()
  }

  async createNewStory(userEmail: string, storiesId: number) {
    const url = buildApiUrlWithQuery(this.storyType, 'createNewStory', { 
      user_email: userEmail,
      stories_id: storiesId.toString()
    })
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to create new story: ${response.status}`)
    }
    return response.json()
  }

  // Score endpoints
  async getUserAllScores(userEmail: string, storiesId: number) {
    const url = buildApiUrlWithQuery(this.storyType, 'userAllScores', { 
      user_email: userEmail,
      stories_id: storiesId.toString()
    })
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch user scores: ${response.status}`)
    }
    return response.json()
  }

  async createScore(scoreData: any) {
    const url = buildApiUrl(this.storyType, 'score')
    // Ensure stories_id is included in the score data
    const payload = {
      ...scoreData,
      stories_id: this.storiesId || scoreData.stories_id
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!response.ok) {
      throw new Error(`Failed to create score: ${response.status}`)
    }
    return response.json()
  }

  async deleteScore(scoreId: string | number) {
    const url = buildApiUrl(this.storyType, 'score', scoreId)
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    })
    if (!response.ok) {
      throw new Error(`Failed to delete score: ${response.status}`)
    }
    return response.json()
  }

  // Settings endpoints
  async getSettings(storiesId: number, userEmail?: string) {
    const queryParams: Record<string, string> = { 
      stories_id: storiesId.toString()
    }
    if (userEmail) {
      queryParams.user_email = userEmail
    }
    const url = buildApiUrlWithQuery(this.storyType, 'settings', queryParams)
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch settings: ${response.status}`)
    }
    return response.json()
  }

  async createSettings(settingsData: any) {
    const url = buildApiUrl(this.storyType, 'settings')
    // Ensure stories_id is included in the settings data
    const payload = {
      ...settingsData,
      stories_id: this.storiesId || settingsData.stories_id
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!response.ok) {
      throw new Error(`Failed to create settings: ${response.status}`)
    }
    return response.json()
  }

  async updateSettings(settingsId: string | number, settingsData: any) {
    const url = buildApiUrl(this.storyType, 'settings', settingsId)
    // Ensure stories_id is included in the settings data
    const payload = {
      ...settingsData,
      stories_id: this.storiesId || settingsData.stories_id
    }
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!response.ok) {
      throw new Error(`Failed to update settings: ${response.status}`)
    }
    return response.json()
  }

  async updateSettingsGeneral(settingsData: any) {
    // Choose the correct update method based on story configuration
    const config = getStoryConfig(this.storyType)
    
    // Ensure stories_id is included
    const payload = {
      ...settingsData,
      stories_id: this.storiesId || settingsData.stories_id
    }
    
    if (config.usesUpdateSettingsEndpoint) {
      // Island survival uses the update_settings endpoint
      const url = `${config.baseUrl}/update_settings`
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!response.ok) {
        throw new Error(`Failed to update settings: ${response.status}`)
      }
      return response.json()
    } else {
      // Zombie survival uses the standard PATCH endpoint with ID
      if (!payload.id) {
        throw new Error('Settings ID is required for this story type')
      }
      return this.updateSettings(payload.id, payload)
    }
  }

  async deleteSettings(settingsId: string | number) {
    const url = buildApiUrl(this.storyType, 'settings', settingsId)
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    })
    if (!response.ok) {
      throw new Error(`Failed to delete settings: ${response.status}`)
    }
    return response.json()
  }

  // Leaderboard endpoints
  async getLeaderboard(storiesId: number) {
    const url = buildApiUrlWithQuery(this.storyType, 'leaderboardValues', { 
      stories_id: storiesId.toString()
    })
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch leaderboard: ${response.status}`)
    }
    return response.json()
  }

  // Roles endpoints
  async getRoles(storiesId: number) {
    const url = buildApiUrlWithQuery(this.storyType, 'roles', { 
      stories_id: storiesId.toString()
    })
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch roles: ${response.status}`)
    }
    return response.json()
  }

  // Active story endpoint - gets current user's active story with next decision options
  async getActiveStory(userEmail: string, storiesId: number) {
    const config = getStoryConfig(this.storyType)
    const url = `${config.baseUrl}/active_story?user_email=${encodeURIComponent(userEmail)}&stories_id=${storiesId}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch active story: ${response.status}`)
    }
    return response.json()
  }

  // Get story by decision_id - helper method to find story ID from decision_id
  async getStoryByDecisionId(decisionId: string, storiesId: number) {
    const config = getStoryConfig(this.storyType)
    const url = `${config.baseUrl}/stories_individual?decision_id=${encodeURIComponent(decisionId)}&stories_id=${storiesId}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch story by decision_id: ${response.status}`)
    }
    return response.json()
  }
}

// Factory function to create API service for current story
export function createApiService(storyType: StoryType, storiesId?: number): ApiService {
  return new ApiService(storyType, storiesId)
}

// Function to fetch all available stories
export async function fetchAllStories(): Promise<any[]> {
  const response = await fetch('https://xsc3-mvx7-r86m.n7e.xano.io/api:7l5S8ZC7/stories')
  if (!response.ok) {
    throw new Error(`Failed to fetch stories: ${response.status}`)
  }
  return response.json()
}
