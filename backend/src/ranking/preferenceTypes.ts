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
}
