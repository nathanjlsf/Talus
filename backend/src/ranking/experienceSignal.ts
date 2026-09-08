import type {
  ExperienceWithTrail,
} from "../repositories/experienceRepository.js"

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

const ATTRIBUTES: ExperienceAttribute[] = [
  "distance",
  "elevation",
  "difficulty",
  "terrain",
  "scenic",
  "nature",
  "solitude",
]

function normalizeDifficulty(
  difficulty: string
): number | null {
  switch (difficulty.toLowerCase()) {
    case "easy":
      return 0
    case "moderate":
      return 0.5
    case "hard":
      return 1
    default:
      return null
  }
}

function normalizeTerrain(
  terrain: string | null
): number | null {
  if (!terrain) {
    return null
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
      return null
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

function getTrailValue(
  experience: ExperienceWithTrail,
  attribute: ExperienceAttribute
): number | null {
  switch (attribute) {
    case "distance":
      return normalizeDistance(
        experience.trail.distance_miles
      )

    case "elevation":
      return normalizeElevation(
        experience.trail.elevation_gain_feet
      )

    case "difficulty":
      return normalizeDifficulty(
        experience.trail.difficulty
      )

    case "terrain":
      return normalizeTerrain(
        experience.trail.terrain
      )

    case "scenic":
      return experience.trail.scenic_score

    case "nature":
      return experience.trail.nature_score

    case "solitude":
      return experience.trail.solitude_score

    default:
      return null
  }
}

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

    for (const attribute of ATTRIBUTES) {
      const trailValue =
        getTrailValue(
          experience,
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

  for (const attribute of ATTRIBUTES) {
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
