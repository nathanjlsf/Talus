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

const CANDIDATE_LIMIT = 180

function limitCandidates(
  trails: Trail[]
): Trail[] {
  if (trails.length <= CANDIDATE_LIMIT) {
    return trails
  }

  const sorted = [...trails].sort(
    (first, second) => first.id - second.id
  )

  const step = sorted.length / CANDIDATE_LIMIT
  const indexes = new Set<number>()

  for (
    let index = 0;
    index < CANDIDATE_LIMIT;
    index += 1
  ) {
    indexes.add(
      Math.min(
        sorted.length - 1,
        Math.floor(index * step)
      )
    )
  }

  return [...indexes]
    .sort((first, second) => first - second)
    .map((index) => sorted[index]!)
}

export function selectComparisonPairs(
  trails: Trail[],
  count: number,
  seenPairs: ComparisonPair[] = [],
  preferences: UserPreference[] = [],
  excludedTrailIds: number[] = []
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

  const excludedTrailIdSet =
    new Set(excludedTrailIds)

  const candidates = limitCandidates(
    trails.filter(
      (trail) =>
        !excludedTrailIdSet.has(trail.id)
    )
  )

  const best: Array<
    ComparisonPair & {
      score: number
    }
  > = []

  function consider(
    pair: ComparisonPair & {
      score: number
    }
  ) {
    const insertAt = best.findIndex(
      (item) => pair.score > item.score
    )

    if (best.length < count) {
      if (insertAt === -1) {
        best.push(pair)
      } else {
        best.splice(insertAt, 0, pair)
      }

      return
    }

    if (insertAt === -1) {
      return
    }

    best.splice(insertAt, 0, pair)
    best.pop()
  }

  for (
    let firstIndex = 0;
    firstIndex < candidates.length;
    firstIndex += 1
  ) {
    for (
      let secondIndex =
        firstIndex + 1;
      secondIndex < candidates.length;
      secondIndex += 1
    ) {
      const first =
        candidates[firstIndex]

      const second =
        candidates[secondIndex]

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

      const comparisonNumber =
        seenPairs.length

      const targetDifference =
        comparisonNumber % 4 === 0
          ? 0.85
          : comparisonNumber % 4 === 1
            ? 0.55
            : comparisonNumber % 4 === 2
              ? 0.65
              : 0.8

      const differencePreference =
        -Math.abs(
          difference - targetDifference
        )

      const score =
        preferences.length > 0
          ? information +
            differencePreference * 0.5
          : differencePreference

      consider({
        firstTrailId: first.id,
        secondTrailId: second.id,
        score,
      })
    }
  }

  return best.map(
    ({
      firstTrailId,
      secondTrailId,
    }) => ({
      firstTrailId,
      secondTrailId,
    })
  )
}
