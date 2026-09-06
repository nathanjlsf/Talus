import type {
  UserPreference,
} from "./preferenceTypes.js"

interface PreferenceInsight {
  attribute: UserPreference["attribute"]
  label: string
  direction: "high" | "low" | "neutral"
  message: string
}

const labels: Record<string, string> = {
  scenic: "scenic views",
  forest: "forest",
  coastal: "coastal trails",
  solitude: "solitude",
  difficulty: "difficulty",
  distance: "longer hikes",
  elevation: "elevation",
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