import {
  createExperience,
  getExperienceForActivity,
  getExperiencesForUser,
} from "../repositories/experienceRepository.js"

import type { 
  Experience,
  ExperienceWithTrail,
} from "../repositories/experienceRepository.js"

export function recordExperience(input: {
  activity_id: number
  overall_rating: number
  scenic_rating?: number
  difficulty_rating?: number
  solitude_rating?: number
  notes?: string
}): Experience {
  if (input.activity_id <= 0) {
    throw new Error("Invalid activity ID")
  }

  if (
    !Number.isInteger(input.overall_rating) ||
    input.overall_rating < 1 ||
    input.overall_rating > 5
  ) {
    throw new Error("Overall rating must be between 1 and 5")
  }

  return createExperience(input)
}

export function findExperienceForActivity(
  activityId: number
): Experience | undefined {
  return getExperienceForActivity(activityId)
}

export function listExperiencesForUser(
  userId: number
): ExperienceWithTrail[] {
  if (userId <= 0) {
    throw new Error("Invalid user ID")
  }

  return getExperiencesForUser(userId)
}
