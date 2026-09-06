import type {
  PreferenceAttribute,
  UserPreference,
} from "./preferenceTypes.js"

import type { Comparison } from "./types.js"

interface TrailPreferenceData {
  id: number

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
  trail: TrailPreferenceData,
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

export function calculatePreferences(
  comparisons: Comparison[],
  trails: TrailPreferenceData[]
): UserPreference[] {
  const trailMap = new Map(
    trails.map((trail) => [trail.id, trail])
  )

  return LEARNED_ATTRIBUTES.map((attribute) => {
    let signal = 0
    let evidenceCount = 0

    for (const comparison of comparisons) {
      const winner = trailMap.get(
        comparison.winnerTrailId
      )

      const loser = trailMap.get(
        comparison.loserTrailId
      )

      if (!winner || !loser) {
        continue
      }

      const winnerValue = getAttributeValue(
        winner,
        attribute
      )

      const loserValue = getAttributeValue(
        loser,
        attribute
      )

      if (
        winnerValue === null ||
        loserValue === null ||
        winnerValue === loserValue
      ) {
        continue
      }

      signal += winnerValue - loserValue
      evidenceCount += 1
    }

    if (evidenceCount === 0) {
      return {
        attribute,
        score: 50,
        confidence: 0,
      }
    }

    const averageSignal =
      signal / evidenceCount

    const normalizedSignal =
      Math.max(
        -1,
        Math.min(1, averageSignal)
      )

    const score =
      50 + normalizedSignal * 50

    const confidence = Math.min(
      1,
      evidenceCount / 5
    )

    return {
      attribute,
      score,
      confidence,
    }
  })
}