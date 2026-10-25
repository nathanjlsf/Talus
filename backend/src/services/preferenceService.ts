import {
  createComparison,
  getComparisonsForUser,
} from "../repositories/comparisonRepository.js"

import db from "../db/database.js"

import {
  getTrailsForUserSignals,
  type Trail,
} from "../repositories/trailRepository.js"

import {
  savePreferences,
  getPreferencesForUser,
} from "../repositories/preferenceRepository.js"

import {
  blendPreferenceScores,
} from "../ranking/blendPreferences.js"

import {
  calculatePreferences,
} from "../ranking/calculatePreferences.js"

import type {
  UserPreference,
} from "../ranking/preferenceTypes.js"

import {
  listExperiencesForUser,
} from "./experienceService.js"

import {
  calculateExperienceSignal,
} from "../ranking/experienceSignal.js"

import {
  applyPreferredRanges,
  buildLikedTrails,
  calculatePreferredRanges,
} from "../ranking/preferredRange.js"

import { listRecordedHikeRows } from "../repositories/activityRepository.js"

import {
  calculateTrackSignal,
  paceRatioFor,
  trackSweetSpotRating,
  type RecordedHike,
} from "../ranking/trackSignal.js"

export function listComparisonsForUser(
  userId: number
) {
  return getComparisonsForUser(userId)
}

export function recordComparison(comparison: {
  user_id: number
  winner_trail_id: number
  loser_trail_id: number
}) {
  const result = createComparison(comparison)

  updateUserPreferences(comparison.user_id)

  return result
}

export function calculateUserPreferences(
  userId: number,
  trails: Trail[]
): UserPreference[] {
  const comparisons =
    getComparisonsForUser(userId)

  const rankingComparisons =
    comparisons.map((comparison) => ({
      winnerTrailId:
        comparison.winner_trail_id,

      loserTrailId:
        comparison.loser_trail_id,
    }))

  return calculatePreferences(
    rankingComparisons,
    trails
  )
}

export function updateUserPreferences(
  userId: number
): UserPreference[] {
  const preferences =
    calculateCombinedPreferences(userId)

  savePreferences(
    userId,
    preferences
  )

  return preferences
}

export function getUserPreferences(
  userId: number
): UserPreference[] {
  return getPreferencesForUser(userId)
}

export function calculateUserExperienceSignal(
  userId: number
) {
  const experiences =
    listExperiencesForUser(userId)

  return calculateExperienceSignal(
    experiences
  )
}

function recordedHikesForUser(
  userId: number
): RecordedHike[] {
  return listRecordedHikeRows(userId).map((row) => ({
    trail: {
      distance_miles: row.distance_miles,
      elevation_gain_feet: row.elevation_gain_feet,
      elevation_status: row.elevation_status,
      difficulty: row.difficulty,
      terrain: row.terrain,
      scenic_score: row.scenic_score,
      nature_score: row.nature_score,
      solitude_score: row.solitude_score,
      forest_score: row.forest_score,
      water_score: row.water_score,
      coastal_score: row.coastal_score,
    },
    completionFraction: row.completion_fraction,
    turnedAround: row.turned_around === 1,
    paceRatio: paceRatioFor(
      row.pace_seconds_per_mile,
      row.estimated_time_minutes,
      row.distance_miles
    ),
    longStopCount: row.long_stop_count ?? 0,
    viewMoments: row.view_moments ?? 0,
    climbMoments: row.climb_moments ?? 0,
    restMoments: row.rest_moments ?? 0,
  }))
}

export function calculateCombinedPreferences(
  userId: number
): UserPreference[] {
  const trails = getTrailsForUserSignals(userId)

  const recordedHikes =
    recordedHikesForUser(userId)

  const trackResult =
    calculateTrackSignal(recordedHikes)

  const comparisons =
    getComparisonsForUser(userId)

  const pairwisePreferences =
    calculatePreferences(
      comparisons.map((comparison) => ({
        winnerTrailId:
          comparison.winner_trail_id,
        loserTrailId:
          comparison.loser_trail_id,
      })),
      trails
    )

  const experiences =
    listExperiencesForUser(userId)

  const experienceResult =
    calculateExperienceSignal(experiences)

  const trailsById = new Map(
    trails.map((trail) => [
      trail.id,
      trail,
    ])
  )

  const preferredRanges =
    calculatePreferredRanges(
      buildLikedTrails(
        comparisons.map((comparison) => ({
          winnerTrailId:
            comparison.winner_trail_id,
          loserTrailId:
            comparison.loser_trail_id,
        })),
        trailsById,
        [
          ...experiences.map((experience) => ({
            trail: experience.trail,
            rating: experience.overall_rating,
          })),
          ...recordedHikes.flatMap((hike) => {
            const rating = trackSweetSpotRating(hike)

            if (rating === null) {
              return []
            }

            return [
              {
                trail: hike.trail,
                rating,
              },
            ]
          }),
        ]
      )
    )

  const combinedPreferences =
    blendPreferenceScores(
      pairwisePreferences,
      experienceResult,
      trackResult
    )

  return applyPreferredRanges(
    combinedPreferences,
    preferredRanges
  )
}

export function refreshStoredPreferences(): number {
  const rows = db
    .prepare(`
      SELECT user_id FROM (
        SELECT user_id
        FROM preference_comparisons
        UNION
        SELECT activities.user_id AS user_id
        FROM experiences
        JOIN activities
          ON activities.id = experiences.activity_id
        UNION
        SELECT user_id
        FROM activities
        WHERE completion_fraction IS NOT NULL
      )
    `)
    .all() as Array<{ user_id: number }>

  for (const row of rows) {
    updateUserPreferences(row.user_id)
  }

  return rows.length
}
