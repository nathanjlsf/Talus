export type PreferenceAttribute =
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

export interface UserPreference {
  attribute: PreferenceAttribute
  score: number
  confidence: number
  // Sweet spot for distance, elevation, and difficulty, on the normalized 0-1 scale.
  target?: number | null
  tolerance?: number | null
}
