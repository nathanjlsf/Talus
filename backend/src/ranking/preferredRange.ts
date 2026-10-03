import type {
  UserPreference,
} from "./preferenceTypes.js"

import type { Comparison } from "./types.js"

import {
  getAttributeValue,
  isRangeAttribute,
  MAX_DISTANCE_MILES,
  MAX_ELEVATION_FEET,
  RANGE_ATTRIBUTES,
  type RangeAttribute,
  type TrailAttributes,
} from "./trailAttributes.js"

export interface LikedTrail {
  trail: TrailAttributes
  weight: number
}

export interface PreferredRange {
  attribute: RangeAttribute
  target: number
  tolerance: number
  confidence: number
}

export interface PreferredRangeDescription {
  min: number
  max: number
  unit: "miles" | "feet" | "difficulty"
  label: string
}

// Narrowest sweet spot: 1 mile, 200 ft, or a quarter difficulty step.
export const MIN_TOLERANCE: Record<RangeAttribute, number> = {
  distance: 0.1,
  elevation: 0.1,
  difficulty: 0.25,
}

const MAX_TOLERANCE = 0.5

export function buildLikedTrails(
  comparisons: Comparison[],
  trailsById: Map<number, TrailAttributes>,
  ratedTrails: Array<{
    trail: TrailAttributes
    rating: number
  }>
): LikedTrail[] {
  const likedTrails: LikedTrail[] = []

  for (const comparison of comparisons) {
    const winner = trailsById.get(
      comparison.winnerTrailId
    )

    if (winner) {
      likedTrails.push({
        trail: winner,
        weight: 1,
      })
    }
  }

  for (const { trail, rating } of ratedTrails) {
    if (rating >= 4) {
      likedTrails.push({
        trail,
        weight: (rating - 3) / 2,
      })
    }
  }

  return likedTrails
}

export function applyPreferredRanges(
  preferences: UserPreference[],
  ranges: PreferredRange[]
): UserPreference[] {
  return preferences.map((preference) => {
    if (!isRangeAttribute(preference.attribute)) {
      return preference
    }

    const range = ranges.find(
      (item) =>
        item.attribute === preference.attribute
    )

    if (!range) {
      return {
        ...preference,
        target: null,
        tolerance: null,
      }
    }

    return {
      ...preference,
      confidence: range.confidence,
      target: range.target,
      tolerance: range.tolerance,
    }
  })
}

export function calculatePreferredRanges(
  likedTrails: LikedTrail[]
): PreferredRange[] {
  const ranges: PreferredRange[] = []

  for (const attribute of RANGE_ATTRIBUTES) {
    const samples = likedTrails
      .map(({ trail, weight }) => ({
        value: getAttributeValue(trail, attribute),
        weight,
      }))
      .filter(
        (sample): sample is {
          value: number
          weight: number
        } =>
          sample.value !== null &&
          sample.weight > 0
      )

    const totalWeight = samples.reduce(
      (sum, sample) => sum + sample.weight,
      0
    )

    if (totalWeight === 0) {
      continue
    }

    const target =
      samples.reduce(
        (sum, sample) =>
          sum + sample.value * sample.weight,
        0
      ) / totalWeight

    const variance =
      samples.reduce(
        (sum, sample) =>
          sum +
          sample.weight *
            (sample.value - target) ** 2,
        0
      ) / totalWeight

    const tolerance = Math.min(
      MAX_TOLERANCE,
      Math.max(
        MIN_TOLERANCE[attribute],
        Math.sqrt(variance)
      )
    )

    const confidence = Math.min(
      0.9,
      1 - Math.exp(-totalWeight / 4)
    )

    ranges.push({
      attribute,
      target: round(target),
      tolerance: round(tolerance),
      confidence: Number(confidence.toFixed(2)),
    })
  }

  return ranges
}

// 1 inside the sweet spot, falling smoothly to -1 far outside it.
export function rangeFit(
  value: number,
  target: number,
  tolerance: number
): number {
  const distance = value - target

  const fit = Math.exp(
    -(distance * distance) /
      (2 * tolerance * tolerance)
  )

  return 2 * fit - 1
}

export type RangePreference = UserPreference & {
  attribute: RangeAttribute
  target: number
}

export function hasPreferredRange(
  preference: UserPreference
): preference is RangePreference {
  return (
    isRangeAttribute(preference.attribute) &&
    preference.target != null
  )
}

export function getTolerance(
  preference: RangePreference
): number {
  const minimum =
    MIN_TOLERANCE[preference.attribute]

  return Math.max(
    minimum,
    preference.tolerance ?? minimum
  )
}

const difficultyLevels = [
  { label: "easy", value: 0 },
  { label: "moderate", value: 0.5 },
  { label: "hard", value: 1 },
] as const

function difficultyLabel(
  target: number,
  low: number,
  high: number
) {
  const inRange = difficultyLevels.filter(
    (level) =>
      level.value >= low - 1e-9 &&
      level.value <= high + 1e-9
  )

  if (inRange.length === 0) {
    const nearest = [...difficultyLevels].sort(
      (a, b) =>
        Math.abs(a.value - target) -
        Math.abs(b.value - target)
    )[0]!

    return nearest.label
  }

  const first = inRange[0]!
  const last = inRange[inRange.length - 1]!

  return first === last
    ? first.label
    : `${first.label} to ${last.label}`
}

function roundTo(value: number, step: number) {
  return Math.round(value / step) * step
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 1,
  })
}

export function describePreferredRange(
  preference: UserPreference
): PreferredRangeDescription | null {
  if (!hasPreferredRange(preference)) {
    return null
  }

  const tolerance = getTolerance(preference)

  const low = Math.max(
    0,
    preference.target - tolerance
  )

  const high = Math.min(
    1,
    preference.target + tolerance
  )

  switch (preference.attribute) {
    case "distance": {
      const min = roundTo(
        low * MAX_DISTANCE_MILES,
        0.5
      )

      const max = roundTo(
        high * MAX_DISTANCE_MILES,
        0.5
      )

      const label =
        high >= 1
          ? `${formatNumber(min)}+ miles`
          : `${formatNumber(min)} to ${formatNumber(max)} miles`

      return {
        min,
        max,
        unit: "miles",
        label,
      }
    }

    case "elevation": {
      const min = roundTo(
        low * MAX_ELEVATION_FEET,
        100
      )

      const max = roundTo(
        high * MAX_ELEVATION_FEET,
        100
      )

      const label =
        high >= 1
          ? `${formatNumber(min)}+ ft`
          : `${formatNumber(min)} to ${formatNumber(max)} ft`

      return {
        min,
        max,
        unit: "feet",
        label,
      }
    }

    case "difficulty":
      return {
        min: low,
        max: high,
        unit: "difficulty",
        label: difficultyLabel(
          preference.target,
          low,
          high
        ),
      }

    default:
      return null
  }
}

function round(value: number) {
  return Number(value.toFixed(3))
}
