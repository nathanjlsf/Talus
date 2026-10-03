import type { UserPreference } from "./preferenceTypes.js"

import type {
  TrailAttributes,
} from "./trailAttributes.js"

import {
  getAttributeMatch,
} from "./personalizedScoring.js"

import {
  describePreferredRange,
  hasPreferredRange,
  type RangePreference,
} from "./preferredRange.js"

export interface RecommendationExplanation {
  attribute: UserPreference["attribute"]
  direction: "positive" | "negative"
  message: string
}

const labels: Record<
  UserPreference["attribute"],
  string
> = {
  distance: "distance",
  elevation: "elevation gain",
  difficulty: "difficulty",
  terrain: "terrain",
  scenic: "scenery",
  nature: "natural surroundings",
  solitude: "solitude",
  forest: "forest",
  water: "water",
  coastal: "coastal scenery",
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 1,
  })
}

function rangeMessage(
  trail: TrailAttributes,
  preference: RangePreference,
  isMatch: boolean,
  isAbove: boolean
): string {
  const range =
    describePreferredRange(preference)?.label

  switch (preference.attribute) {
    case "distance": {
      const miles = formatNumber(
        trail.distance_miles
      )

      if (isMatch) {
        return `At ${miles} miles, it's in your sweet spot of ${range}.`
      }

      return isAbove
        ? `Longer than you usually enjoy: ${miles} miles versus your usual ${range}.`
        : `Shorter than you usually enjoy: ${miles} miles versus your usual ${range}.`
    }

    case "elevation": {
      const feet = formatNumber(
        trail.elevation_gain_feet
      )

      if (isMatch) {
        return `${feet} ft of climbing is in your sweet spot of ${range}.`
      }

      return isAbove
        ? `More climbing than you usually enjoy: ${feet} ft versus your usual ${range}.`
        : `Less climbing than you usually enjoy: ${feet} ft versus your usual ${range}.`
    }

    case "difficulty": {
      const difficulty =
        trail.difficulty.toLowerCase()

      if (isMatch) {
        return `Its ${difficulty} rating fits the ${range} trails you usually pick.`
      }

      return isAbove
        ? `Harder than the ${range} trails you usually pick.`
        : `Easier than the ${range} trails you usually pick.`
    }
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
    if (preference.confidence < 0.4) {
      continue
    }

    const match = getAttributeMatch(
      trail,
      preference
    )

    if (
      match.value === null ||
      match.signal === null
    ) {
      continue
    }

    const contribution =
      match.signal * match.weight

    if (Math.abs(contribution) < 0.1) {
      continue
    }

    const isPositive = contribution > 0

    let message: string

    if (hasPreferredRange(preference)) {
      message = rangeMessage(
        trail,
        preference,
        isPositive,
        match.value > preference.target
      )
    } else {
      const label =
        labels[preference.attribute]

      message = isPositive
        ? `Strong match: this trail's ${label} fit what Talus has learned you prefer.`
        : `Potential mismatch: this trail's ${label} differs from what Talus has learned you prefer.`
    }

    candidates.push({
      attribute: preference.attribute,
      direction: isPositive
        ? "positive"
        : "negative",
      message,
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
