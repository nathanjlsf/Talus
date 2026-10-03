import {
  createComparison,
  getComparisonsForUser,
} from "../repositories/comparisonRepository.js"

import db from "../db/database.js"

import {
  getAllTrails,
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
  trails = getAllTrails()
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

export function calculateCombinedPreferences(
  userId: number
): UserPreference[] {
  const trails = getAllTrails()

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
        experiences.map((experience) => ({
          trail: experience.trail,
          rating: experience.overall_rating,
        }))
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

      if (
        pairwiseEvidence === 0 &&
        experienceEvidence === 0
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

      const totalStrength =
        pairwiseStrength +
        experienceStrength

      if (totalStrength === 0) {
        return preference
      }

      const combinedScore =
        (
          preference.score *
            pairwiseStrength +
          experienceScore *
            experienceStrength
        ) / totalStrength

      const combinedConfidence =
        Math.min(
          0.9,
          1 -
            Math.exp(
              -(
                pairwiseEvidence +
                experienceEvidence
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
