import type { UserPreference } from "./preferenceTypes.js"

interface TrailAttributes {
  scenic_score: number | null
  forest_score: number | null
  coastal_score: number | null
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
  scenic: "scenic views",
  forest: "forest",
  coastal: "coastal views",
  solitude: "solitude",
  difficulty: "difficulty",
  distance: "longer hikes",
  elevation: "elevation",
}

function getTrailValue(
  trail: TrailAttributes,
  attribute: UserPreference["attribute"]
): number | null {
  switch (attribute) {
    case "scenic":
      return trail.scenic_score

    case "forest":
      return trail.forest_score

    case "coastal":
      return trail.coastal_score

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
          ? `Strong match: this trail's ${label} align with your preferences.`
          : `Potential mismatch: this trail's ${label} may be less aligned with your preferences.`,
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
