import type {
  PreferenceAttribute,
  UserPreference,
} from "./preferenceTypes.js"

interface TrailAttributes {
  distance_miles: number
  elevation_gain_feet: number
  difficulty: string
  terrain: string | null
  scenic_score: number | null
  nature_score: number | null
  solitude_score: number | null
  forest_score: number | null
  water_score: number | null
  coastal_score: number | null
}

const LEARNED_ATTRIBUTES: PreferenceAttribute[] = [
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
  trail: TrailAttributes,
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

    case "forest":
      return trail.forest_score

    case "water":
      return trail.water_score

    case "coastal":
      return trail.coastal_score

    default:
      return null
  }
}

export function calculatePersonalizedScore(
  trail: TrailAttributes,
  preferences: UserPreference[]
): number {
  let weightedScore = 0
  let totalWeight = 0

  for (const attribute of LEARNED_ATTRIBUTES) {
    const trailValue = getAttributeValue(
      trail,
      attribute
    )

    const preference = preferences.find(
      (item) => item.attribute === attribute
    )

    if (
      trailValue === null ||
      !preference
    ) {
      continue
    }

    const preferenceStrength =
      (preference.score - 50) / 50

    const trailSignal =
      (trailValue - 0.5) / 0.5

    const weight =
      Math.abs(preferenceStrength) *
      preference.confidence

    const contribution =
      trailSignal *
      preferenceStrength *
      preference.confidence

    weightedScore += contribution
    totalWeight += weight
  }

  if (totalWeight === 0) {
    return 50
  }

  const normalizedScore =
    50 +
    (weightedScore / totalWeight) * 50

  return Math.max(
    0,
    Math.min(100, normalizedScore)
  )
}
