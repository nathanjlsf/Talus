import type {
  ExperienceWithTrail,
} from "../repositories/experienceRepository.js"

export type ExperienceAttribute =
  | "scenic"
  | "forest"
  | "coastal"
  | "solitude"

export interface ExperienceSignal {
  signal: Record<ExperienceAttribute, number>
  evidence: Record<ExperienceAttribute, number>
}

export function calculateExperienceSignal(
  experiences: ExperienceWithTrail[]
): ExperienceSignal {
  const attributes: ExperienceAttribute[] = [
    "scenic",
    "forest",
    "coastal",
    "solitude",
  ]

  const totals: Record<ExperienceAttribute, number> = {
    scenic: 0,
    forest: 0,
    coastal: 0,
    solitude: 0,
  }

  const evidence: Record<ExperienceAttribute, number> = {
    scenic: 0,
    forest: 0,
    coastal: 0,
    solitude: 0,
  }

  for (const experience of experiences) {
    const ratings: Partial<
      Record<ExperienceAttribute, number | null>
    > = {
      scenic: experience.scenic_rating,
      solitude: experience.solitude_rating,
    }

    for (const attribute of attributes) {
      const rating = ratings[attribute]

      if (rating === null || rating === undefined) {
        continue
      }

      const signal = (rating - 3) / 2

      totals[attribute] += signal
      evidence[attribute] += 1
    }
  }

  const signal: Record<
    ExperienceAttribute,
    number
  > = {
    scenic: 0,
    forest: 0,
    coastal: 0,
    solitude: 0,
  }

  for (const attribute of attributes) {
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