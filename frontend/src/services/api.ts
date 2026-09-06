const API_BASE_URL = "http://localhost:3000/api"

export interface Trail {
  id: number
  name: string
  location: string | null
  description: string | null
  distance_miles: number
  elevation_gain_feet: number
  difficulty: string
}

export interface RecommendationExplanation {
  attribute: UserPreference["attribute"]
  direction: "positive" | "negative"
  message: string
}

export interface RankedTrail {
  rank: number
  trail: {
    id: number
    name: string
    location: string | null
    description: string | null
    distance_miles: number
    elevation_gain_feet: number
    difficulty: string
  }
  score: number
  explanations: RecommendationExplanation[]
}

export interface UserPreference {
  attribute:
    | "scenic"
    | "forest"
    | "coastal"
    | "solitude"
    | "difficulty"
    | "distance"
    | "elevation"

  score: number
  confidence: number
}

export interface PreferenceInsight {
  attribute: UserPreference["attribute"]
  label: string
  direction: "high" | "low" | "neutral"
  message: string
}

export async function getPreferenceInsights(
  userId: number
): Promise<PreferenceInsight[]> {
  const response = await fetch(
    `${API_BASE_URL}/preferences/${userId}/insights`
  )

  if (!response.ok) {
    throw new Error(
      "Failed to fetch preference insights"
    )
  }

  return response.json()
}

export async function getPreferences(
  userId: number
): Promise<UserPreference[]> {
  const response = await fetch(
    `${API_BASE_URL}/preferences/${userId}`
  )

  if (!response.ok) {
    throw new Error("Failed to fetch preferences")
  }

  return response.json()
}

export async function recalculatePreferences(
  userId: number
): Promise<UserPreference[]> {
  const response = await fetch(
    `${API_BASE_URL}/preferences/${userId}/recalculate`,
    {
      method: "POST",
    }
  )

  if (!response.ok) {
    throw new Error(
      "Failed to recalculate preferences"
    )
  }

  return response.json()
}

export async function getRanking(
  userId: number
): Promise<RankedTrail[]> {
  const response = await fetch(
    `${API_BASE_URL}/preferences/${userId}/ranking`
  )

  if (!response.ok) {
    throw new Error("Failed to fetch ranking")
  }

  return response.json()
}

export async function submitComparison(
  userId: number,
  winnerTrailId: number,
  loserTrailId: number
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/comparisons`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        winner_trail_id: winnerTrailId,
        loser_trail_id: loserTrailId,
      }),
    }
  )

  if (!response.ok) {
    throw new Error("Failed to submit comparison")
  }
}

export async function getTrails(filters: {
  search?: string
  location?: string
  difficulty?: string
  maxDistance?: number
  maxElevation?: number
} = {}): Promise<Trail[]> {
  const params = new URLSearchParams()

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim())
  }

  if (filters.location) {
    params.set("location", filters.location)
  }

  if (filters.difficulty) {
    params.set("difficulty", filters.difficulty)
  }

  if (filters.maxDistance !== undefined) {
    params.set("maxDistance", String(filters.maxDistance))
  }

  if (filters.maxElevation !== undefined) {
    params.set("maxElevation", String(filters.maxElevation))
  }

  const query = params.toString()

  const response = await fetch(
    `${API_BASE_URL}/trails${query ? `?${query}` : ""}`
  )

  if (!response.ok) {
    throw new Error("Failed to fetch trails")
  }

  return response.json()
}

export async function getTrail(
  trailId: number
): Promise<RankedTrail["trail"]> {
  const response = await fetch(
    `${API_BASE_URL}/trails/${trailId}`
  )

  if (!response.ok) {
    throw new Error("Failed to fetch trail")
  }

  return response.json()
}

export async function createActivity(input: {
  user_id: number
  trail_id: number
  started_at?: string
  ended_at?: string
  distance_miles?: number
  elevation_gain_feet?: number
  duration_seconds?: number
}): Promise<{ id: number }> {
  const response = await fetch(
    `${API_BASE_URL}/activities`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }
  )

  if (!response.ok) {
    throw new Error("Failed to create activity")
  }

  return response.json()
}

export async function createExperience(input: {
  activity_id: number
  overall_rating: number
  scenic_rating?: number
  difficulty_rating?: number
  solitude_rating?: number
  notes?: string
}): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/experiences`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }
  )

  if (!response.ok) {
    throw new Error("Failed to create experience")
  }
}