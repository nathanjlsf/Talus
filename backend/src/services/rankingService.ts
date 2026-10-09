import {
  findTrailsByIds,
  loadScopedTrails,
  type TrailScope,
} from "../services/trailService.js"

import {
  getUserPreferences,
} from "./preferenceService.js"

import {
  calculatePersonalizedScore,
} from "../ranking/personalizedScoring.js"

import {
  clampTrailLimit,
} from "../repositories/trailRepository.js"

import type {
  RankingResult,
} from "../ranking/types.js"

import {
  generateRecommendationExplanations,
} from "../ranking/recommendationExplanation.js"

export function calculateRanking(
  userId: number,
  scope: TrailScope & {
    trailIds?: number[]
  } = {}
): RankingResult[] {
  const trails = scope.trailIds?.length
    ? findTrailsByIds(scope.trailIds)
    : loadScopedTrails(
        userId,
        {
          ...scope,
          limit: null,
        },
        { fallbackToLatestCounty: false }
      )

  const preferences =
    getUserPreferences(userId)

  const ranked = trails
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

  const topMatches = scope.trailIds?.length
    ? ranked
    : scope.limit == null
      ? ranked
      : ranked.slice(0, clampTrailLimit(scope.limit))

  return topMatches
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

        forest_score:
          result.trail.forest_score,

        water_score:
          result.trail.water_score,

        coastal_score:
          result.trail.coastal_score,
      },

      score: result.score,

      explanations:
        generateRecommendationExplanations(
          result.trail,
          preferences
        ),
    }))
}
