import {
  getComparisonsForUser,
} from "../repositories/comparisonRepository.js"

import {
  getAllTrails,
} from "../repositories/trailRepository.js"

import {
  calculatePairwiseRanking,
} from "../ranking/calculateRanking.js"

import type {
  Comparison,
  RankingResult,
} from "../ranking/types.js"

export function calculateRanking(
  userId: number
): RankingResult[] {
  const comparisons = getComparisonsForUser(userId)

  const rankingComparisons: Comparison[] =
    comparisons.map((comparison) => ({
      winnerTrailId: comparison.winner_trail_id,
      loserTrailId: comparison.loser_trail_id,
    }))

  const ranking = calculatePairwiseRanking(
    rankingComparisons
  )

  const trails = getAllTrails()

  return ranking
    .map((rankedTrail, index) => {
      const trail = trails.find(
        (trail) => trail.id === rankedTrail.trailId
      )

      if (!trail) {
        return null
      }

      return {
        rank: index + 1,
        trail: {
          id: trail.id,
          name: trail.name,
          location: trail.location,
          description: trail.description,
          distance_miles: trail.distance_miles,
          elevation_gain_feet: trail.elevation_gain_feet,
          difficulty: trail.difficulty,
        },
        score: rankedTrail.score,
      }
    })
    .filter(
      (result): result is RankingResult =>
        result !== null
    )
}