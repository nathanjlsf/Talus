import type {
  PreferenceAttribute,
  UserPreference,
} from "./preferenceTypes.js"

interface TrailAttributes {
  scenic_score: number | null
  forest_score: number | null
  coastal_score: number | null
  solitude_score: number | null
}

const LEARNED_ATTRIBUTES: PreferenceAttribute[] = [
  "scenic",
  "forest",
  "coastal",
  "solitude",
]

function getAttributeValue(
  trail: TrailAttributes,
  attribute: PreferenceAttribute
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