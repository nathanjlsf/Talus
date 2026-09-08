import {
  getAllTrails,
} from "../repositories/trailRepository.js"

import {
  getUserPreferences,
} from "./preferenceService.js"

import {
  calculatePersonalizedScore,
} from "../ranking/personalizedScoring.js"

import type {
  RankingResult,
} from "../ranking/types.js"

import {
  generateRecommendationExplanations,
} from "../ranking/recommendationExplanation.js"

export function calculateRanking(
  userId: number
): RankingResult[] {
  const trails = getAllTrails()

  const preferences =
    getUserPreferences(userId)

  return trails
    .map((trail) => ({
      trail,
      score: calculatePersonalizedScore(
        trail,
        preferences
      ),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score
      }

      return a.trail.id - b.trail.id
    })
    .map((result, index) => ({
      rank: index + 1,

      trail: {
        id: result.trail.id,
        name: result.trail.name,
        location: result.trail.location,
        description: result.trail.description,

        distance_miles:
          result.trail.distance_miles,

        estimated_time_minutes:
          result.trail.estimated_time_minutes,

        elevation_gain_feet:
          result.trail.elevation_gain_feet,

        difficulty:
          result.trail.difficulty,

        terrain:
          result.trail.terrain,

        scenic_score:
          result.trail.scenic_score,

        nature_score:
          result.trail.nature_score,

        solitude_score:
          result.trail.solitude_score,

        water_score:
          result.trail.water_score,
      },

      score: result.score,

      explanations:
        generateRecommendationExplanations(
          result.trail,
          preferences
        ),
    }))
}
