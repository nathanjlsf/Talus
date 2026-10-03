import type {
  ExperienceWithTrail,
} from "../repositories/experienceRepository.js"

import {
  getAttributeValue,
} from "./trailAttributes.js"

export type ExperienceAttribute =
  | "distance"
  | "elevation"
  | "difficulty"
  | "terrain"
  | "scenic"
  | "nature"
  | "solitude"

export interface ExperienceSignal {
  signal: Record<ExperienceAttribute, number>
  evidence: Record<ExperienceAttribute, number>
}

export const EXPERIENCE_ATTRIBUTES: ExperienceAttribute[] = [
  "distance",
  "elevation",
  "difficulty",
  "terrain",
  "scenic",
  "nature",
  "solitude",
]
export function calculateExperienceSignal(
  experiences: ExperienceWithTrail[]
): ExperienceSignal {
  const totals: Record<
    ExperienceAttribute,
    number
  > = {
    distance: 0,
    elevation: 0,
    difficulty: 0,
    terrain: 0,
    scenic: 0,
    nature: 0,
    solitude: 0,
  }

  const evidence: Record<
    ExperienceAttribute,
    number
  > = {
    distance: 0,
    elevation: 0,
    difficulty: 0,
    terrain: 0,
    scenic: 0,
    nature: 0,
    solitude: 0,
  }

  for (const experience of experiences) {
    const experienceSignal =
      (experience.overall_rating - 3) / 2

    for (const attribute of EXPERIENCE_ATTRIBUTES) {
      const trailValue =
        getAttributeValue(
          experience.trail,
          attribute
        )

      if (trailValue === null) {
        continue
      }

      const trailSignal =
        (trailValue - 0.5) / 0.5

      totals[attribute] +=
        trailSignal * experienceSignal

      evidence[attribute] += 1
    }
  }

  const signal: Record<
    ExperienceAttribute,
    number
  > = {
    distance: 0,
    elevation: 0,
    difficulty: 0,
    terrain: 0,
    scenic: 0,
    nature: 0,
    solitude: 0,
  }

  for (const attribute of EXPERIENCE_ATTRIBUTES) {
    if (evidence[attribute] > 0) {
      signal[attribute] =
        totals[attribute] /
        evidence[attribute]
    }
  }

  return {
    signal,
    evidence,
  }
}
