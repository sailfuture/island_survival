export type StoryType = 'island' | 'zombie'

export interface StoryConfig {
  name: string
  baseUrl: string
  endpoints: {
    stories: string
    score: string
    settings: string
    roles: string
    createNewStory: string
    userAllScores: string
    leaderboardValues: string
  }
  usesUpdateSettingsEndpoint?: boolean
  theme: {
    primaryColor: string
    terminology: {
      crew: string
      leader: string
      captain: string
      health: string
      morale: string
      resources: string
      gameTitle: string
    }
    descriptions: {
      health: string
      morale: string
      resources: string
    }
  }
}

export const STORY_CONFIGS: Record<StoryType, StoryConfig> = {
  island: {
    name: "Island Survival",
    baseUrl: "https://xsc3-mvx7-r86m.n7e.xano.io/api:7l5S8ZC7",
    endpoints: {
      stories: "stories_individual",
      score: "island_survival_score",
      settings: "island_survival_settings",
      roles: "island_survival_roles",
      createNewStory: "create_new_story",
      userAllScores: "user_all_scores",
      leaderboardValues: "leaderboard_values"
    },
    usesUpdateSettingsEndpoint: true, // Island uses the special update_settings endpoint
    theme: {
      primaryColor: "blue",
      terminology: {
        crew: "Crew",
        leader: "Tribe Chief",
        captain: "Tribe Leader",
        health: "Health",
        morale: "Morale", 
        resources: "Resources",
        gameTitle: "Edge of Survival"
      },
      descriptions: {
        health: "Physical condition of the crew",
        morale: "Team spirit and motivation",
        resources: "Food, water, and supplies"
      }
    }
  },
  zombie: {
    name: "Zombie Survival",
    baseUrl: "https://xsc3-mvx7-r86m.n7e.xano.io/api:auA9Suns",
    endpoints: {
      stories: "stories_individual",
      score: "story_score", 
      settings: "story_settings",
      roles: "story_roles",
      createNewStory: "create_new_story_zombie",
      userAllScores: "user_all_scores_zombies",
      leaderboardValues: "leaderboard_values_zombies"
    },
    usesUpdateSettingsEndpoint: false, // Zombie uses standard PATCH endpoint with ID
    theme: {
      primaryColor: "red",
      terminology: {
        crew: "Survivors",
        leader: "Group Leader",
        captain: "Squad Leader", 
        health: "Health",
        morale: "Sanity",
        resources: "Supplies",
        gameTitle: "Zombie Apocalypse"
      },
      descriptions: {
        health: "Physical condition of survivors",
        morale: "Mental stability and hope",
        resources: "Weapons, food, and medical supplies"
      }
    }
  }
}

export const DEFAULT_STORY: StoryType = 'island'

export function getStoryConfig(storyType: StoryType): StoryConfig {
  return STORY_CONFIGS[storyType] || STORY_CONFIGS[DEFAULT_STORY]
}

export function getStoryFromUrl(searchParams: URLSearchParams): StoryType {
  const story = searchParams.get('story') as StoryType
  return story && story in STORY_CONFIGS ? story : DEFAULT_STORY
}

export function buildApiUrl(storyType: StoryType, endpoint: keyof StoryConfig['endpoints'], id?: string | number): string {
  const config = getStoryConfig(storyType)
  const endpointName = config.endpoints[endpoint]
  
  if (id !== undefined) {
    return `${config.baseUrl}/${endpointName}/${id}`
  }
  
  return `${config.baseUrl}/${endpointName}`
}

export function buildApiUrlWithQuery(storyType: StoryType, endpoint: keyof StoryConfig['endpoints'], queryParams: Record<string, string>): string {
  const baseUrl = buildApiUrl(storyType, endpoint)
  const params = new URLSearchParams(queryParams)
  return `${baseUrl}?${params.toString()}`
}
