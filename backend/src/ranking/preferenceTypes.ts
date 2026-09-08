export type PreferenceAttribute =
  | "distance"
  | "elevation"
  | "difficulty"
  | "terrain"
  | "scenic"
  | "nature"
  | "solitude"

export interface UserPreference {
  attribute: PreferenceAttribute
  score: number
  confidence: number
}
