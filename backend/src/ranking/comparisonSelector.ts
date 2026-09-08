import type { Trail } from "../repositories/trailRepository.js"
import type { UserPreference } from "./preferenceTypes.js"

import {
  calculatePairInformation,
} from "./comparisonInformation.js"

export interface ComparisonPair {
  firstTrailId: number
  secondTrailId: number
}

function normalizeDifficulty(
  difficulty: string
): number {
  switch (difficulty.toLowerCase()) {
    case "easy":
      return 0

    case "moderate":
      return 0.5

    case "hard":
      return 1

    default:
      return 0.5
  }
}

function normalizeTerrain(
  terrain: string | null
): number {
  if (!terrain) {
    return 0.5
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
      return 0.5
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

function getTrailVector(
  trail: Trail
): number[] {
  return [
    normalizeDistance(
      trail.distance_miles
    ),

    normalizeElevation(
      trail.elevation_gain_feet
    ),

    normalizeDifficulty(
      trail.difficulty
    ),

    normalizeTerrain(
      trail.terrain
    ),

    trail.scenic_score ?? 0.5,

    trail.nature_score ?? 0.5,

    trail.solitude_score ?? 0.5,
  ]
}

function calculateDifference(
  first: Trail,
  second: Trail
): number {
  const firstVector =
    getTrailVector(first)

  const secondVector =
    getTrailVector(second)

  let squaredDifference = 0

  for (
    let index = 0;
    index < firstVector.length;
    index += 1
  ) {
    const firstValue =
      firstVector[index]

    const secondValue =
      secondVector[index]

    if (
      firstValue === undefined ||
      secondValue === undefined
    ) {
      continue
    }

    const difference =
      firstValue - secondValue

    squaredDifference +=
      difference * difference
  }

  return Math.sqrt(
    squaredDifference
  )
}

function getPairKey(
  firstTrailId: number,
  secondTrailId: number
): string {
  return [
    Math.min(
      firstTrailId,
      secondTrailId
    ),
    Math.max(
      firstTrailId,
      secondTrailId
    ),
  ].join(":")
}

export function selectComparisonPairs(
  trails: Trail[],
  count: number,
  seenPairs: ComparisonPair[] = [],
  preferences: UserPreference[] = []
): ComparisonPair[] {
  const seenPairKeys = new Set(
    seenPairs.map(
      (pair) =>
        getPairKey(
          pair.firstTrailId,
          pair.secondTrailId
        )
    )
  )

  const pairs: Array<
    ComparisonPair & {
      score: number
    }
  > = []

  for (
    let firstIndex = 0;
    firstIndex < trails.length;
    firstIndex += 1
  ) {
    for (
      let secondIndex =
        firstIndex + 1;
      secondIndex < trails.length;
      secondIndex += 1
    ) {
      const first =
        trails[firstIndex]

      const second =
        trails[secondIndex]

      if (
        first === undefined ||
        second === undefined
      ) {
        continue
      }

      const pairKey =
        getPairKey(
          first.id,
          second.id
        )

      if (
        seenPairKeys.has(pairKey)
      ) {
        continue
      }

      const difference =
        calculateDifference(
          first,
          second
        )

      const information =
        calculatePairInformation(
          first,
          second,
          preferences
        )

      const hasLearnedPreferences =
        preferences.some(
          (preference) =>
            preference.confidence > 0
        )

      const score =
        preferences.length > 0
          ? information
          : difference

      pairs.push({
        firstTrailId: first.id,
        secondTrailId: second.id,
        score,
      })
    }
  }

  return pairs
    .sort(
      (first, second) =>
        second.score -
        first.score
    )
    .slice(0, count)
    .map(
      ({
        firstTrailId,
        secondTrailId,
      }) => ({
        firstTrailId,
        secondTrailId,
      })
    )
}
