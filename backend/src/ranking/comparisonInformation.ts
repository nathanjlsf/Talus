import type { Trail } from "../repositories/trailRepository.js"
import type {
  PreferenceAttribute,
  UserPreference,
} from "./preferenceTypes.js"

const LEARNED_ATTRIBUTES: PreferenceAttribute[] = [
  "distance",
  "elevation",
  "difficulty",
  "terrain",
  "scenic",
  "nature",
  "solitude",
]

function normalizeDifficulty(
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

function normalizeTerrain(
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

    case "mixed":
      return 0.75

    case "rocky":
      return 1

    default:
      return null
  }
}

function normalizeDistance(
  distance: number
): number {
  return Math.max(
    0,
    Math.min(1, distance / 10)
  )
}

function normalizeElevation(
  elevation: number
): number {
  return Math.max(
    0,
    Math.min(1, elevation / 2000)
  )
}

function getAttributeValue(
  trail: Trail,
  attribute: PreferenceAttribute
): number | null {
  switch (attribute) {
    case "distance":
      return normalizeDistance(
        trail.distance_miles
      )

    case "elevation":
      return normalizeElevation(
        trail.elevation_gain_feet
      )

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

    default:
      return null
  }
}

export function calculatePairInformation(
  first: Trail,
  second: Trail,
  preferences: UserPreference[]
): number {
  let information = 0

  for (const preference of preferences) {
    const firstValue =
      getAttributeValue(
        first,
        preference.attribute
      )

    const secondValue =
      getAttributeValue(
        second,
        preference.attribute
      )

    if (
      firstValue === null ||
      secondValue === null
    ) {
      continue
    }

    const difference =
      Math.abs(
        firstValue - secondValue
      )

    const uncertainty =
      1 - preference.confidence

    information +=
      difference * uncertainty
  }

  return information
}
