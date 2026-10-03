import type {
  UserPreference,
} from "./preferenceTypes.js"

import {
  describePreferredRange,
} from "./preferredRange.js"

interface PreferenceInsight {
  attribute: UserPreference["attribute"]
  label: string
  direction: "high" | "low" | "range" | "neutral"
  message: string
}

const labels: Record<string, string> = {
  distance: "hike distance",
  elevation: "elevation gain",
  difficulty: "difficulty",
  terrain: "terrain",
  scenic: "scenic views",
  nature: "nature",
  solitude: "solitude",
  forest: "forest",
  water: "water",
  coastal: "coastal scenery",
}

function rangeMessage(
  attribute: UserPreference["attribute"],
  range: string
): string {
  switch (attribute) {
    case "distance":
      return `You enjoy hikes around ${range}.`

    case "elevation":
      return `You enjoy around ${range} of climbing.`

    case "difficulty":
      return `You usually go for ${range} trails.`

    default:
      return `You enjoy ${range}.`
  }
}

export function generatePreferenceInsights(
  preferences: UserPreference[]
): PreferenceInsight[] {
  return preferences.map((preference) => {
    const label =
      labels[preference.attribute] ??
      preference.attribute

    if (preference.confidence < 0.4) {
      return {
        attribute: preference.attribute,
        label,
        direction: "neutral",
        message: `Talus is still learning how you feel about ${label}.`,
      }
    }

    const range =
      describePreferredRange(preference)

    if (range) {
      return {
        attribute: preference.attribute,
        label,
        direction: "range",
        message: rangeMessage(
          preference.attribute,
          range.label
        ),
      }
    }

    if (preference.score >= 65) {
      return {
        attribute: preference.attribute,
        label,
        direction: "high",
        message: `You tend to prefer ${label}.`,
      }
    }

    if (preference.score <= 35) {
      return {
        attribute: preference.attribute,
        label,
        direction: "low",
        message: `You tend to prefer trails with less ${label}.`,
      }
    }

    return {
      attribute: preference.attribute,
      label,
      direction: "neutral",
      message: `You don't show a strong preference for ${label} yet.`,
    }
  })
}
