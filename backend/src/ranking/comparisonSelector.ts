import type { Trail } from "../repositories/trailRepository.js"
import type { UserPreference } from "./preferenceTypes.js"

import {
  calculatePairInformation,
} from "./comparisonInformation.js"

import {
  getAttributeValue,
  LEARNED_ATTRIBUTES,
} from "./trailAttributes.js"

export interface ComparisonPair {
  firstTrailId: number
  secondTrailId: number
}

const MISSING_VALUE = 0.5

function getTrailVector(trail: Trail): number[] {
  return LEARNED_ATTRIBUTES.map((attribute) => {
    const value = getAttributeValue(
      trail,
      attribute
    )

    return value === null
      ? MISSING_VALUE
      : value
  })
}

function calculateDifference(
  first: Trail,
  second: Trail
): number {
  const firstVector = getTrailVector(first)
  const secondVector = getTrailVector(second)

  let squaredDifference = 0

  for (
    let index = 0;
    index < firstVector.length;
    index += 1
  ) {
    const firstValue = firstVector[index]
    const secondValue = secondVector[index]

    if (
      firstValue === undefined ||
      secondValue === undefined
    ) {
      continue
    }

    const difference = firstValue - secondValue

    squaredDifference += difference * difference
  }

  return Math.sqrt(squaredDifference)
}

function getPairKey(
  firstTrailId: number,
  secondTrailId: number
): string {
  return [
    Math.min(firstTrailId, secondTrailId),
    Math.max(firstTrailId, secondTrailId),
  ].join(":")
}

const CANDIDATE_LIMIT = 180

function hasLearnedPreference(
  preferences: UserPreference[]
): boolean {
  return preferences.some(
    (preference) =>
      preference.confidence > 0 ||
      preference.target != null
  )
}

function limitCandidates(trails: Trail[]): Trail[] {
  if (trails.length <= CANDIDATE_LIMIT) {
    return trails
  }

  const selected = new Map<number, Trail>()
  const tailCount = Math.max(
    1,
    Math.floor(
      CANDIDATE_LIMIT /
        (LEARNED_ATTRIBUTES.length * 2)
    )
  )

  for (const attribute of LEARNED_ATTRIBUTES) {
    const valued = trails
      .map((trail) => ({
        trail,
        value: getAttributeValue(trail, attribute),
      }))
      .filter(
        (
          item
        ): item is {
          trail: Trail
          value: number
        } => item.value !== null
      )
      .sort(
        (first, second) =>
          first.value - second.value
      )

    for (const item of valued.slice(0, tailCount)) {
      selected.set(item.trail.id, item.trail)
    }

    for (const item of valued.slice(-tailCount)) {
      selected.set(item.trail.id, item.trail)
    }
  }

  if (selected.size > CANDIDATE_LIMIT) {
    return [...selected.values()]
      .sort((first, second) => first.id - second.id)
      .slice(0, CANDIDATE_LIMIT)
  }

  const remaining = [...trails]
    .filter((trail) => !selected.has(trail.id))
    .sort((first, second) => first.id - second.id)

  const slots = CANDIDATE_LIMIT - selected.size

  if (slots > 0 && remaining.length > 0) {
    const step = remaining.length / slots

    for (
      let index = 0;
      index < slots;
      index += 1
    ) {
      const trail =
        remaining[
          Math.min(
            remaining.length - 1,
            Math.floor(index * step)
          )
        ]

      if (trail) {
        selected.set(trail.id, trail)
      }
    }
  }

  return [...selected.values()].sort(
    (first, second) => first.id - second.id
  )
}

export function selectComparisonPairs(
  trails: Trail[],
  count: number,
  seenPairs: ComparisonPair[] = [],
  preferences: UserPreference[] = [],
  excludedTrailIds: number[] = []
): ComparisonPair[] {
  const seenPairKeys = new Set(
    seenPairs.map((pair) =>
      getPairKey(
        pair.firstTrailId,
        pair.secondTrailId
      )
    )
  )

  const excludedTrailIdSet = new Set(
    excludedTrailIds
  )

  const candidates = limitCandidates(
    trails.filter(
      (trail) => !excludedTrailIdSet.has(trail.id)
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

  const learned =
    hasLearnedPreference(preferences)

  for (
    let firstIndex = 0;
    firstIndex < candidates.length;
    firstIndex += 1
  ) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < candidates.length;
      secondIndex += 1
    ) {
      const first = candidates[firstIndex]
      const second = candidates[secondIndex]

      if (
        first === undefined ||
        second === undefined
      ) {
        continue
      }

      const pairKey = getPairKey(
        first.id,
        second.id
      )

      if (seenPairKeys.has(pairKey)) {
        continue
      }

      const difference = calculateDifference(
        first,
        second
      )

      const information =
        calculatePairInformation(
          first,
          second,
          preferences
        )

      const comparisonNumber = seenPairs.length

      const targetDifference =
        comparisonNumber % 4 === 0
          ? 0.85
          : comparisonNumber % 4 === 1
            ? 0.55
            : comparisonNumber % 4 === 2
              ? 0.65
              : 0.8

      const differencePreference =
        -Math.abs(difference - targetDifference)

      const score = learned
        ? information + differencePreference * 0.5
        : differencePreference

      consider({
        firstTrailId: first.id,
        secondTrailId: second.id,
        score,
      })
    }
  }

  return best.map(
    ({ firstTrailId, secondTrailId }) => ({
      firstTrailId,
      secondTrailId,
    })
  )
}
