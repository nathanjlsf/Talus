export type PreferenceAttribute =
  | "scenic"
  | "forest"
  | "coastal"
  | "solitude"
  | "difficulty"
  | "distance"
  | "elevation"

export interface UserPreference {
  attribute: PreferenceAttribute
  score: number
  confidence: number
}