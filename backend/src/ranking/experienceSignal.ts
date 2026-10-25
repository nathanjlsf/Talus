import type {
  ExperienceWithTrail,
} from "../repositories/experienceRepository.js"

import {
  getAttributeValue,
  LEARNED_ATTRIBUTES,
} from "./trailAttributes.js"

import type {
  PreferenceAttribute,
} from "./preferenceTypes.js"

export type ExperienceAttribute = PreferenceAttribute

export interface ExperienceSignal {
  signal: Record<ExperienceAttribute, number>
  evidence: Record<ExperienceAttribute, number>
}

export const EXPERIENCE_ATTRIBUTES: ExperienceAttribute[] =
  LEARNED_ATTRIBUTES

const FACET_RATINGS: Partial<
  Record<
    ExperienceAttribute,
    "scenic_rating" | "difficulty_rating" | "solitude_rating"
  >
> = {
  scenic: "scenic_rating",
  difficulty: "difficulty_rating",
  solitude: "solitude_rating",
}

function emptyScores(): Record<ExperienceAttribute, number> {
  return {
    distance: 0,
    elevation: 0,
    difficulty: 0,
    terrain: 0,
    scenic: 0,
    nature: 0,
    solitude: 0,
    forest: 0,
    water: 0,
    coastal: 0,
  }
}

function ratingFor(
  experience: ExperienceWithTrail,
  attribute: ExperienceAttribute
): number {
  const facet = FACET_RATINGS[attribute]

  if (facet) {
    const rating = experience[facet]

    if (typeof rating === "number") {
      return rating
    }
  }

  return experience.overall_rating
}

export function calculateExperienceSignal(
  experiences: ExperienceWithTrail[]
): ExperienceSignal {
  const totals = emptyScores()
  const evidence = emptyScores()

  for (const experience of experiences) {
    for (const attribute of EXPERIENCE_ATTRIBUTES) {
      const trailValue = getAttributeValue(
        experience.trail,
        attribute
      )

      if (trailValue === null) {
        continue
      }

      const experienceSignal =
        (ratingFor(experience, attribute) - 3) / 2

      const trailSignal =
        (trailValue - 0.5) / 0.5

      totals[attribute] +=
        trailSignal * experienceSignal

      evidence[attribute] += 1
    }
  }

  const signal = emptyScores()

  for (const attribute of EXPERIENCE_ATTRIBUTES) {
    if (evidence[attribute] > 0) {
      signal[attribute] =
        totals[attribute] / evidence[attribute]
    }
  }

  return {
    signal,
    evidence,
  }
}
