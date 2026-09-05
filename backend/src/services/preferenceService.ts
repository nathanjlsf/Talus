import {
  createComparison,
  getComparisonsForUser,
} from "../repositories/comparisonRepository.js"

import type { PreferenceComparison } from "../repositories/comparisonRepository.js"

export function recordComparison(input: {
  user_id: number
  winner_trail_id: number
  loser_trail_id: number
}): PreferenceComparison {
  if (input.winner_trail_id === input.loser_trail_id) {
    throw new Error("Winner and loser must be different trails")
  }

  return createComparison(input)
}

export function listComparisonsForUser(
  userId: number
): PreferenceComparison[] {
  return getComparisonsForUser(userId)
}