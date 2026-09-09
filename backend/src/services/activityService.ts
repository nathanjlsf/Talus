import {
  createActivity,
  getActivitiesForUser,
  getActivityWithTrailById,
} from "../repositories/activityRepository.js"

import type {
  Activity,
  ActivityWithTrail,
} from "../repositories/activityRepository.js"

export function recordActivity(input: {
  user_id: number
  trail_id: number
  started_at?: string
  ended_at?: string
  distance_miles?: number
  elevation_gain_feet?: number
  duration_seconds?: number
}): Activity {
  if (input.user_id <= 0) {
    throw new Error("Invalid user ID")
  }

  if (input.trail_id <= 0) {
    throw new Error("Invalid trail ID")
  }

  return createActivity(input)
}

export function listActivitiesForUser(
  userId: number
): ActivityWithTrail[] {
  return getActivitiesForUser(userId)
}

export function findActivityById(
  activityId: number
) {
  if (activityId <= 0) {
    throw new Error("Invalid activity ID")
  }

  return getActivityWithTrailById(activityId)
}
