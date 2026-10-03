import db from "../../db/database.js"

import {
  estimateDifficulty,
} from "./difficultyEstimator.js"

interface EstimableTrail {
  id: number
  distance_miles: number
  elevation_gain_feet: number
  terrain: string | null
}

function estimateUnknownDifficulty(
  trail: EstimableTrail
): boolean {
  const estimate = estimateDifficulty({
    distance_miles: trail.distance_miles,
    elevation_gain_feet: trail.elevation_gain_feet,
    terrain: trail.terrain ?? "Unknown",
  })

  const result = db
    .prepare(`
      UPDATE trails
      SET
        difficulty = ?,
        difficulty_source = 'estimated'
      WHERE id = ?
        AND difficulty = 'Unknown'
    `)
    .run(
      estimate.difficulty,
      trail.id
    )

  return result.changes > 0
}

export function applyEstimatedDifficultyForTrail(
  trailId: number
): boolean {
  const trail = db
    .prepare(`
      SELECT
        id,
        distance_miles,
        elevation_gain_feet,
        terrain,
        difficulty,
        elevation_status
      FROM trails
      WHERE id = ?
    `)
    .get(trailId) as
      | (EstimableTrail & {
          difficulty: string
          elevation_status: string | null
        })
      | undefined

  if (
    !trail ||
    trail.difficulty !== "Unknown" ||
    trail.elevation_status !== "complete"
  ) {
    return false
  }

  return estimateUnknownDifficulty(trail)
}

export function backfillEstimatedDifficulty(): number {
  const trails = db
    .prepare(`
      SELECT
        id,
        distance_miles,
        elevation_gain_feet,
        terrain
      FROM trails
      WHERE difficulty = 'Unknown'
        AND elevation_status = 'complete'
    `)
    .all() as EstimableTrail[]

  let updated = 0

  for (const trail of trails) {
    if (estimateUnknownDifficulty(trail)) {
      updated += 1
    }
  }

  return updated
}
