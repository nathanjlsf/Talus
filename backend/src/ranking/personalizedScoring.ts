import type {
  UserPreference,
} from "./preferenceTypes.js"

import {
  getAttributeValue,
  LEARNED_ATTRIBUTES,
  type TrailAttributes,
} from "./trailAttributes.js"

import {
  getTolerance,
  hasPreferredRange,
  rangeFit,
} from "./preferredRange.js"

export interface AttributeMatch {
  value: number | null
  signal: number | null
  weight: number
}

export function getAttributeMatch(
  trail: TrailAttributes,
  preference: UserPreference
): AttributeMatch {
  const value = getAttributeValue(
    trail,
    preference.attribute
  )

  if (hasPreferredRange(preference)) {
    return {
      value,
      signal:
        value === null
          ? null
          : rangeFit(
              value,
              preference.target,
              getTolerance(preference)
            ),
      weight: preference.confidence,
    }
  }

  const preferenceStrength =
    (preference.score - 50) / 50

  return {
    value,
    signal:
      value === null
        ? null
        : ((value - 0.5) / 0.5) *
          Math.sign(preferenceStrength),
    weight:
      Math.abs(preferenceStrength) *
      preference.confidence,
  }
}

export function calculatePersonalizedScore(
  trail: TrailAttributes,
  preferences: UserPreference[]
): number {
  let weightedScore = 0
  let totalWeight = 0

  for (const attribute of LEARNED_ATTRIBUTES) {
    const preference = preferences.find(
      (item) => item.attribute === attribute
    )

    if (!preference) {
      continue
    }

    const match = getAttributeMatch(
      trail,
      preference
    )

    // Attributes the trail is missing still count toward the total as
    // neutral, so a thinly tagged trail can't reach the top on one or
    // two matches.
    totalWeight += match.weight

    if (match.signal !== null) {
      weightedScore +=
        match.signal * match.weight
    }
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
