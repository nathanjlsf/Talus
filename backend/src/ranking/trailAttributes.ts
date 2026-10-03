import type {
  PreferenceAttribute,
} from "./preferenceTypes.js"

export interface TrailAttributes {
  distance_miles: number
  elevation_gain_feet: number
  elevation_status?: string | null
  difficulty: string
  terrain: string | null
  scenic_score: number | null
  nature_score: number | null
  solitude_score: number | null
  forest_score?: number | null
  water_score?: number | null
  coastal_score?: number | null
}

export const LEARNED_ATTRIBUTES: PreferenceAttribute[] = [
  "distance",
  "elevation",
  "difficulty",
  "terrain",
  "scenic",
  "nature",
  "solitude",
  "forest",
  "water",
  "coastal",
]

export type RangeAttribute =
  | "distance"
  | "elevation"
  | "difficulty"

export const RANGE_ATTRIBUTES: RangeAttribute[] = [
  "distance",
  "elevation",
  "difficulty",
]

export function isRangeAttribute(
  attribute: PreferenceAttribute
): attribute is RangeAttribute {
  return (
    RANGE_ATTRIBUTES as PreferenceAttribute[]
  ).includes(attribute)
}

export const MAX_DISTANCE_MILES = 10
export const MAX_ELEVATION_FEET = 2000

export function normalizeDistance(
  distance: number
): number {
  return Math.max(
    0,
    Math.min(1, distance / MAX_DISTANCE_MILES)
  )
}

export function normalizeElevation(
  elevation: number
): number {
  return Math.max(
    0,
    Math.min(1, elevation / MAX_ELEVATION_FEET)
  )
}

export function normalizeDifficulty(
  difficulty: string
): number | null {
  switch (difficulty.toLowerCase()) {
    case "easy":
      return 0

    case "moderate":
      return 0.5

    case "hard":
      return 1

    default:
      return null
  }
}

export function normalizeTerrain(
  terrain: string | null
): number | null {
  if (!terrain) {
    return null
  }

  switch (terrain.toLowerCase()) {
    case "paved":
      return 0

    case "dirt":
      return 0.5

    case "gravel":
      return 0.6

    case "mixed":
      return 0.75

    case "rocky":
      return 1

    default:
      return null
  }
}

// Imported trails start at 0 ft until elevation enrichment completes.
function hasKnownElevation(
  trail: TrailAttributes
): boolean {
  return !(
    trail.elevation_gain_feet === 0 &&
    trail.elevation_status != null &&
    trail.elevation_status !== "complete"
  )
}

export function getAttributeValue(
  trail: TrailAttributes,
  attribute: PreferenceAttribute
): number | null {
  switch (attribute) {
    case "distance":
      return normalizeDistance(
        trail.distance_miles
      )

    case "elevation":
      return hasKnownElevation(trail)
        ? normalizeElevation(
            trail.elevation_gain_feet
          )
        : null

    case "difficulty":
      return normalizeDifficulty(
        trail.difficulty
      )

    case "terrain":
      return normalizeTerrain(
        trail.terrain
      )

    case "scenic":
      return trail.scenic_score

    case "nature":
      return trail.nature_score

    case "solitude":
      return trail.solitude_score

    case "forest":
      return trail.forest_score ?? null

    case "water":
      return trail.water_score ?? null

    case "coastal":
      return trail.coastal_score ?? null

    default:
      return null
  }
}
