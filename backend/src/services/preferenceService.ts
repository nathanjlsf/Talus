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
    calculateUserPreferences(userId)

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