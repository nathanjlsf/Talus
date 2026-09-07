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
  return createComparison(comparison)
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

  return pairwisePreferences.map(
    (preference) => {
      const attribute =
        preference.attribute

      if (
        !(
          attribute === "scenic" ||
          attribute === "forest" ||
          attribute === "coastal" ||
          attribute === "solitude"
        )
      ) {
        return preference
      }

      const experienceEvidence =
        experienceResult.evidence[attribute]

      if (experienceEvidence === 0) {
        return preference
      }

      const experienceScore =
        50 +
        experienceResult.signal[attribute] * 50

      const combinedScore =
        preference.score * 0.7 +
        experienceScore * 0.3

      const pairwiseConfidence =
        preference.confidence

      const experienceConfidence =
        Math.min(
          1,
          experienceEvidence / 5
        )

      const combinedConfidence = Number(
        (
          pairwiseConfidence * 0.7 +
          experienceConfidence * 0.3
        ).toFixed(2)  
      )

      return {
        attribute: preference.attribute,
        score: combinedScore,
        confidence: combinedConfidence,
      }
    }
  )
}
