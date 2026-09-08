import type { UserPreference } from "./preferenceTypes.js"

interface TrailAttributes {
  distance_miles: number
  elevation_gain_feet: number
  difficulty: string
  terrain: string | null
  scenic_score: number | null
  nature_score: number | null
  solitude_score: number | null
}

export interface RecommendationExplanation {
  attribute: UserPreference["attribute"]
  direction: "positive" | "negative"
  message: string
}

const labels: Record<
  UserPreference["attribute"],
  string
> = {
  distance: "distance",
  elevation: "elevation gain",
  difficulty: "difficulty",
  terrain: "terrain",
  scenic: "scenery",
  nature: "natural surroundings",
  solitude: "solitude",
}

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

function getTrailValue(
  trail: TrailAttributes,
  attribute: UserPreference["attribute"]
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

export function generateRecommendationExplanations(
  trail: TrailAttributes,
  preferences: UserPreference[]
): RecommendationExplanation[] {
  const candidates: Array<
    RecommendationExplanation & {
      contribution: number
    }
  > = []

  for (const preference of preferences) {
    const trailValue = getTrailValue(
      trail,
      preference.attribute
    )

    if (
      trailValue === null ||
      preference.confidence < 0.4
    ) {
      continue
    }

    const preferenceStrength =
      (preference.score - 50) / 50

    const trailSignal =
      (trailValue - 0.5) / 0.5

    const contribution =
      trailSignal *
      preferenceStrength *
      preference.confidence

    if (Math.abs(contribution) < 0.1) {
      continue
    }

    const label =
      labels[preference.attribute]

    candidates.push({
      attribute: preference.attribute,
      direction:
        contribution > 0
          ? "positive"
          : "negative",
      message:
        contribution > 0
          ? `Strong match: this trail's ${label} fit what Talus has learned you prefer.`
          : `Potential mismatch: this trail's ${label} difffer from what Talus has learned you prefer.`,
      contribution: Math.abs(contribution),
    })
  }

  return candidates
    .sort(
      (a, b) =>
        b.contribution - a.contribution
    )
    .slice(0, 2)
    .map(
      ({
        attribute,
        direction,
        message,
      }) => ({
        attribute,
        direction,
        message,
      })
    )
}
