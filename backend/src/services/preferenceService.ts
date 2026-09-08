import {
  createComparison,
  getComparisonsForUser,
} from "../repositories/comparisonRepository.js"

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
  userId: number
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

  const trails = getAllTrails()

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
  const pairwisePreferences =
    calculateUserPreferences(userId)

  const experienceResult =
    calculateUserExperienceSignal(userId)

  const comparisons =
    getComparisonsForUser(userId)

  return pairwisePreferences.map(
    (preference) => {
      const attribute =
        preference.attribute

      const experienceEvidence =
        experienceResult.evidence[attribute]

      const pairwiseEvidence =
        comparisons.length

      if (
        pairwiseEvidence === 0 &&
        experienceEvidence === 0
      ) {
        return preference
      }

      const experienceSignal =
        experienceResult.signal[attribute]

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
}
