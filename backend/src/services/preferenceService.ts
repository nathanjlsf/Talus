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
  EXPERIENCE_ATTRIBUTES,
  type ExperienceAttribute,
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

  const pairwisePreferences =
    calculateUserPreferences(userId, trails)

  const experiences =
    listExperiencesForUser(userId)

  const experienceResult =
    calculateExperienceSignal(experiences)

  const comparisons =
    getComparisonsForUser(userId)

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

  const combinedPreferences = pairwisePreferences.map(
    (preference) => {
      const attribute =
        preference.attribute

      const isExperienceAttribute =
        EXPERIENCE_ATTRIBUTES.includes(
          attribute as ExperienceAttribute
        )

      const experienceEvidence =
        isExperienceAttribute
          ? experienceResult.evidence[
              attribute as ExperienceAttribute
            ]
          : 0

      const pairwiseEvidence =
        comparisons.length

      const trackEvidence =
        trackResult.evidence[attribute]

      if (
        pairwiseEvidence === 0 &&
        experienceEvidence === 0 &&
        trackEvidence === 0
      ) {
        return preference
      }

      const experienceSignal =
        isExperienceAttribute
          ? experienceResult.signal[
              attribute as ExperienceAttribute
            ]
          : 0

      const experienceScore =
        50 +
        experienceSignal * 50

      const trackScore =
        50 +
        trackResult.signal[attribute] * 50

      const pairwiseStrength =
        1 -
        Math.exp(
          -pairwiseEvidence / 4
        )

      const experienceStrength =
        1 -
        Math.exp(
          -experienceEvidence / 4
        )

      const trackStrength =
        1 -
        Math.exp(
          -trackEvidence / 4
        )

      const totalStrength =
        pairwiseStrength +
        experienceStrength +
        trackStrength

      if (totalStrength === 0) {
        return preference
      }

      const combinedScore =
        (
          preference.score *
            pairwiseStrength +
          experienceScore *
            experienceStrength +
          trackScore *
            trackStrength
        ) / totalStrength

      const combinedConfidence =
        Math.min(
          0.9,
          1 -
            Math.exp(
              -(
                pairwiseEvidence +
                experienceEvidence +
                trackEvidence
              ) / 5
            )
        )

      return {
        attribute,
        score: Math.max(
          10,
          Math.min(
            90,
            combinedScore
          )
        ),
        confidence: Number(
          combinedConfidence.toFixed(2)
        ),
      }
    }
  )

  return applyPreferredRanges(
    combinedPreferences,
    preferredRanges
  )
}

export function backfillMissingPreferredRanges(): number {
  const rows = db
    .prepare(`
      SELECT DISTINCT preferences.user_id AS user_id
      FROM preferences
      WHERE preferences.attribute IN (
        'distance',
        'elevation',
        'difficulty'
      )
        AND preferences.target IS NULL
        AND (
          EXISTS (
            SELECT 1
            FROM preference_comparisons
            WHERE preference_comparisons.user_id = preferences.user_id
          )
          OR EXISTS (
            SELECT 1
            FROM experiences
            JOIN activities
              ON activities.id = experiences.activity_id
            WHERE activities.user_id = preferences.user_id
          )
        )
    `)
    .all() as Array<{ user_id: number }>

  for (const row of rows) {
    updateUserPreferences(row.user_id)
  }

  return rows.length
}
