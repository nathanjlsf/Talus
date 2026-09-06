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
  return preferences
    .map((preference) => {
      const trailValue = getTrailValue(
        trail,
        preference.attribute
      )

      if (
        trailValue === null ||
        preference.confidence < 0.4
      ) {
        return null
      }

      const preferenceStrength =
        (preference.score - 50) / 50

      const trailSignal =
        (trailValue - 0.5) / 0.5

      const contribution =
        trailSignal *
        preferenceStrength

      if (Math.abs(contribution) < 0.1) {
        return null
      }

      const label =
        labels[preference.attribute]

      if (contribution > 0) {
        return {
          attribute: preference.attribute,
          direction: "positive",
          message: `This trail's ${label} align with your preferences.`,
        }
      }

      return {
        attribute: preference.attribute,
        direction: "negative",
        message: `This trail's ${label} may be less aligned with your preferences.`,
      }
    })
    .filter(
      (
        explanation
      ): explanation is RecommendationExplanation =>
        explanation !== null
    )
}