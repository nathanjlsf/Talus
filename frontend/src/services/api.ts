import { getCurrentUser, supabase } from "./supabase"

const API_BASE_URL = 
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api"

async function apiFetch(url: string, init?: RequestInit) {
  const headers = new Headers(init?.headers)
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  return fetch(url, {
    ...init,
    headers,
  })
}

export interface Trail {
  id: number
  name: string
  location: string | null
  county?: string | null
  park_name: string | null
  park_type: string | null
  park_source: string | null
  description: string | null
  distance_miles: number
  estimated_time_minutes: number
  elevation_gain_feet: number
  difficulty: string
  terrain: string
  scenic_score: number | null
  nature_score: number | null
  solitude_score: number | null
  forest_score: number | null
  water_score: number | null
  coastal_score: number | null
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
    county?: string | null
    park_name?: string | null
    description: string | null
    distance_miles: number
    estimated_time_minutes: number
    elevation_gain_feet: number
    difficulty: string
    terrain: string
    scenic_score: number | null
    nature_score: number | null
    solitude_score: number | null
    forest_score: number | null
    water_score: number | null
    coastal_score: number | null
  }
  score: number
  explanations: RecommendationExplanation[]
}

export interface UserPreference {
  attribute:
    | "distance"
    | "elevation"
    | "difficulty"
    | "terrain"
    | "scenic"
    | "nature"
    | "solitude"
    | "forest"
    | "water"
    | "coastal"

  score: number
  confidence: number
  target?: number | null
  tolerance?: number | null
  preferredRange?: PreferredRange | null
}

export interface PreferredRange {
  min: number
  max: number
  unit: "miles" | "feet" | "difficulty"
  label: string
}

export interface PreferenceInsight {
  attribute: UserPreference["attribute"]
  label: string
  direction: "high" | "low" | "range" | "neutral"
  message: string
}

export interface Activity {
  id: number
  user_id: number
  trail_id: number
  started_at: string | null
  ended_at: string | null
  distance_miles: number | null
  elevation_gain_feet: number | null
  duration_seconds: number | null
  created_at: string

  trail: {
    id: number
    name: string
    location: string | null
  }

  experience: {
    id: number
    overall_rating: number
    scenic_rating: number | null
    difficulty_rating: number | null
    solitude_rating: number | null
    notes: string | null
  } | null
}

export interface ComparisonPair {
  firstTrail: RankedTrail["trail"]
  secondTrail: RankedTrail["trail"]
}

export async function getPreferenceInsights(
  userId: number
): Promise<PreferenceInsight[]> {
  const response = await apiFetch(
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
  const response = await apiFetch(
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
  const response = await apiFetch(
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

export interface TrailMapFeature {
  type: "Feature"
  geometry: {
    type: "MultiLineString"
    coordinates: number[][][]
  }
  properties: {
    id: number
    name: string
    score: number
    reason: string | null
    distance_miles: number
    elevation_gain_feet: number
    difficulty: string
    location: string | null
    park_name: string | null
    county: string | null
  }
}

export interface TrailMapCollection {
  type: "FeatureCollection"
  bounds: [number, number, number, number] | null
  features: TrailMapFeature[]
}

export async function getMapTrails(
  userId: number,
  bbox?: string
): Promise<TrailMapCollection> {
  const params = new URLSearchParams({
    userId: String(userId),
  })

  if (bbox) {
    params.set("bbox", bbox)
  }

  const response = await apiFetch(
    `${API_BASE_URL}/trails/map?${params}`
  )

  if (!response.ok) {
    throw new Error("Failed to load the trail map")
  }

  return response.json()
}

export async function getTrailGeometry(
  trailId: number
): Promise<TrailMapFeature> {
  const response = await apiFetch(
    `${API_BASE_URL}/trails/${trailId}/geometry`
  )

  if (!response.ok) {
    throw new Error("Failed to load trail route")
  }

  return response.json()
}

export async function getRanking(
  userId: number
): Promise<RankedTrail[]> {
  const response = await apiFetch(
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
  const response = await apiFetch(
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

  const response = await apiFetch(
    `${API_BASE_URL}/trails${query ? `?${query}` : ""}`
  )

  if (!response.ok) {
    throw new Error("Failed to fetch trails")
  }

  return response.json()
}

export async function getTrail(
  trailId: number
): Promise<Trail> {
  const response = await apiFetch(
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
  const response = await apiFetch(
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

export async function getActivities(
  userId: number
): Promise<Activity[]> {
  const response = await apiFetch(
    `${API_BASE_URL}/activities/${userId}`
  )

  if (!response.ok) {
    throw new Error("Failed to fetch activities")
  }

  return response.json()
}

export type MomentMark = "view" | "climb" | "rest"

export interface TrackPointInput {
  recorded_at: string
  latitude: number
  longitude: number
  accuracy: number | null
  moment: MomentMark | null
}

export interface ElevationSample {
  distance_miles: number
  elevation_feet: number
}

export interface HikeSummary {
  activity: {
    id: number
    user_id: number
    trail_id: number
    started_at: string | null
    ended_at: string | null
    distance_miles: number | null
    elevation_gain_feet: number | null
    duration_seconds: number | null
    moving_seconds: number | null
    pace_seconds_per_mile: number | null
    completion_fraction: number | null
  }
  trail: {
    id: number
    name: string
    location: string | null
    distance_miles: number
    elevation_gain_feet: number
    estimated_time_minutes: number
  }
  learned: string[]
  splits: Array<{ mile: number; seconds: number }>
  route: {
    type: "LineString"
    coordinates: number[][]
  } | null
  elevation_profile: ElevationSample[]
  placement: Array<{
    id: number
    name: string
    location: string | null
    distance_miles: number
    elevation_gain_feet: number
  }>
}

export async function startRecording(
  userId: number,
  trailId: number
): Promise<{ id: number; started_at: string | null }> {
  const response = await apiFetch(
    `${API_BASE_URL}/activities/start`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        trail_id: trailId,
      }),
    }
  )

  if (!response.ok) {
    throw new Error("Failed to start recording")
  }

  return response.json()
}

export async function uploadActivityPoints(
  activityId: number,
  points: TrackPointInput[]
): Promise<void> {
  const response = await apiFetch(
    `${API_BASE_URL}/activities/${activityId}/points`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ points }),
    }
  )

  if (!response.ok) {
    throw new Error("Failed to upload track points")
  }
}

export async function finishRecording(
  activityId: number
): Promise<HikeSummary> {
  const response = await apiFetch(
    `${API_BASE_URL}/activities/${activityId}/finish`,
    {
      method: "POST",
    }
  )

  if (!response.ok) {
    throw new Error("Failed to finish the hike")
  }

  return response.json()
}

export async function getHikeSummary(
  activityId: number
): Promise<HikeSummary> {
  const response = await apiFetch(
    `${API_BASE_URL}/activities/${activityId}/summary`
  )

  if (!response.ok) {
    throw new Error("Failed to load the hike")
  }

  return response.json()
}

export async function getActivity(
  activityId: number
): Promise<Activity> {
  const response = await apiFetch(
    `${API_BASE_URL}/activities/id/${activityId}`
  )

  if (!response.ok) {
    throw new Error("Failed to fetch activity")
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
  const response = await apiFetch(
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

export async function getNextComparison(
  userId: number,
  excludedTrailIds: number[] = []
): Promise<ComparisonPair> {
  const params = new URLSearchParams()

  if (excludedTrailIds.length > 0) {
    params.set(
      "exclude",
      excludedTrailIds.join(",")
    )
  }

  const query = params.toString()

  const response = await apiFetch(
    `${API_BASE_URL}/comparisons/next/${userId}${
      query ? `?${query}` : ""
    }`
  )

  if (!response.ok) {
    throw new Error(
      "Unable to load next comparison"
    )
  }

  return response.json()
}

export async function createTalusUser(input: {
  name: string
  supabase_user_id: string
}): Promise<{ id: number; name: string; supabase_user_id: string }> {
  const response = await apiFetch(`${API_BASE_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error("Failed to create Talus user")
  }

  return response.json()
}

export async function getTalusUser(
  supabaseUserId: string,
): Promise<{
  id: number
  name: string
  supabase_user_id: string
  created_at: string
}> {
  const response = await apiFetch(
    `${API_BASE_URL}/users/${supabaseUserId}`,
  )

  if (!response.ok) {
    throw new Error("Talus user not found")
  }

  return response.json()
}

export async function getCurrentTalusUser() {
  const supabaseUser = await getCurrentUser()

  if (!supabaseUser) {
    throw new Error("No authenticated user")
  }

  return getTalusUser(supabaseUser.id)
}
