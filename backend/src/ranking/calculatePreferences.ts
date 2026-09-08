import type {
  PreferenceAttribute,
  UserPreference,
} from "./preferenceTypes.js"

import type { Comparison } from "./types.js"

interface TrailPreferenceData {
  id: number
  distance_miles: number
  elevation_gain_feet: number
  difficulty: string
  terrain: string | null

  scenic_score: number | null
  nature_score: number | null
  solitude_score: number | null
}

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
  trail: TrailPreferenceData,
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

function getComparisonKey(
  comparison: Comparison
): string {
  return [
    Math.min(
      comparison.winnerTrailId,
      comparison.loserTrailId
    ),
    Math.max(
      comparison.winnerTrailId,
      comparison.loserTrailId
    ),
  ].join(":")
}

export function calculatePreferences(
  comparisons: Comparison[],
  trails: TrailPreferenceData[]
): UserPreference[] {
  const trailMap = new Map(
    trails.map((trail) => [trail.id, trail])
  )

  return LEARNED_ATTRIBUTES.map((attribute) => {
    let weightedSignal = 0
    let totalWeight = 0
    let evidenceCount = 0

    const pairCounts = new Map<
      string,
      number
    >()

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

      const key =
        getComparisonKey(comparison)

      pairCounts.set(
        key,
        (pairCounts.get(key) ?? 0) + 1
      )
    }

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

      const key =
        getComparisonKey(comparison)

      const pairCount =
        pairCounts.get(key) ?? 1

      const weight =
        1 / Math.sqrt(pairCount)

      const direction =
        winnerValue > loserValue
          ? 1
          : -1

      weightedSignal +=
        direction * weight

      totalWeight += weight
      evidenceCount += 1
    }

    if (
      evidenceCount === 0 ||
      totalWeight === 0
    ) {
      return {
        attribute,
        score: 50,
        confidence: 0,
      }
    }

    const averageSignal =
      weightedSignal / totalWeight

    const evidenceStrength =
      1 -
      Math.exp(
        -evidenceCount / 4
      )

    const uniquePairCount =
      pairCounts.size

    const diversity =
      Math.min(
        1,
        uniquePairCount / 5
      )

    const confidence = Math.min(
      0.9,
      evidenceStrength *
        (0.5 + diversity * 0.5)
    )

    const score =
      50 +
      averageSignal *
        40 *
        confidence

    return {
      attribute,
      score: Math.max(
        10,
        Math.min(90, score)
      ),
      confidence: Number(
        confidence.toFixed(2)
      ),
    }
  })
}
