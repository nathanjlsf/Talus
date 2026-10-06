import db from "../../db/database.js"

import {
  getTrailGeometryLines,
} from "../../repositories/trailGeometryRepository.js"

import {
  updateTrailElevationGain,
} from "../../repositories/trailRepository.js"

import {
  applyEstimatedDifficultyForTrail,
} from "../osm/applyEstimatedDifficulty.js"

import {
  sampleGeometry,
} from "./sampleGeometry.js"

import {
  getElevationFromDem,
  DemTileUnavailableError,
} from "./dem.js"

import {
  calculateElevationGain,
} from "./elevationGain.js"

import { isDirectRun } from "../directRun.js"

interface TrailRow {
  id: number
  name: string
  elevation_gain_feet: number
  elevation_attempts: number
}

const TRAILS_PER_RUN = 3
const MAX_ATTEMPTS = 3

function markTrailComplete(
  trailId: number
): void {
  db.prepare(`
    UPDATE trails
    SET
      elevation_status = 'complete',
      elevation_error = NULL
    WHERE id = ?
  `).run(trailId)
}

function markTrailFailed(
  trailId: number,
  error: unknown
): void {
  const message =
    error instanceof Error
      ? error.message
      : String(error)

  db.prepare(`
    UPDATE trails
    SET
      elevation_status = 'failed',
      elevation_error = ?
    WHERE id = ?
  `).run(
    message,
    trailId
  )
}

function incrementAttempts(
  trailId: number
): number {
  db.prepare(`
    UPDATE trails
    SET elevation_attempts =
      elevation_attempts + 1
    WHERE id = ?
  `).run(trailId)

  const row =
    db.prepare(`
      SELECT elevation_attempts
      FROM trails
      WHERE id = ?
    `).get(trailId) as
      | { elevation_attempts: number }
      | undefined

  return row?.elevation_attempts ?? 0
}

async function enrichTrail(
  trail: TrailRow
): Promise<number> {
  const attempt =
    incrementAttempts(trail.id)

  console.log(
    `Processing ${trail.name} ` +
    `(attempt ${attempt}/${MAX_ATTEMPTS})`
  )

  try {
    const lines =
      getTrailGeometryLines(trail.id)
        .filter((line) => line.length >= 2)

    if (lines.length === 0) {
      throw new Error(
        "Insufficient geometry"
      )
    }

    let elevationGain = 0
    let sampleCount = 0

    for (const line of lines) {
      const sampled =
        sampleGeometry(
          line.map((point) => ({
            latitude: point.latitude,
            longitude: point.longitude,
          }))
        )

      const lineElevations = []

      for (const point of sampled) {
        const elevation =
          await getElevationFromDem(
            point.latitude,
            point.longitude
          )

        lineElevations.push({
          elevation_feet: elevation,
        })
      }

      elevationGain +=
        calculateElevationGain(
          lineElevations
        )

      sampleCount += sampled.length
    }

    updateTrailElevationGain(
      trail.id,
      elevationGain
    )

    markTrailComplete(
      trail.id
    )

    applyEstimatedDifficultyForTrail(
      trail.id
    )

    console.log(
      `  ${trail.name}: ${elevationGain} ft ` +
      `(${sampleCount} samples)`
    )

    return elevationGain
  } catch (error) {
    if (error instanceof DemTileUnavailableError) {
      db.prepare(`
        UPDATE trails
        SET
          elevation_status = 'pending',
          elevation_attempts = MAX(elevation_attempts - 1, 0),
          elevation_error = ?
        WHERE id = ?
      `).run(
        error.message,
        trail.id
      )

      console.log(
        `  ${trail.name}: ${error.message}. Left pending.`
      )

      return 0
    }

    const message =
      error instanceof Error
        ? error.message
        : String(error)

    if (attempt >= MAX_ATTEMPTS) {
      markTrailFailed(
        trail.id,
        message
      )

      console.error(
        `  Failed ${trail.name} ` +
        `after ${MAX_ATTEMPTS} attempts:`,
        message
      )
    } else {
      db.prepare(`
        UPDATE trails
        SET elevation_error = ?
        WHERE id = ?
      `).run(
        message,
        trail.id
      )

      console.error(
        `  Attempt ${attempt} failed for ` +
        `${trail.name}:`,
        message
      )
    }

    return 0
  }
}

export async function enrichTrails(
  limit = TRAILS_PER_RUN
): Promise<void> {
  const trails =
    db.prepare(`
      SELECT
        id,
        name,
        elevation_gain_feet,
        elevation_attempts
      FROM trails
      WHERE source = 'openstreetmap'
        AND (
          elevation_status = 'pending'
          OR (
            elevation_status = 'failed'
            AND elevation_attempts < ?
          )
        )
      ORDER BY id
      LIMIT ?
    `).all(
      MAX_ATTEMPTS,
      limit
    ) as TrailRow[]

  console.log(
    `Enriching ${trails.length} trails...`
  )

  for (const trail of trails) {
    await enrichTrail(trail)
  }

  console.log(
    "Elevation enrichment run complete."
  )
}

const limitArgument =
  Number(process.argv[2])

const limit =
  Number.isInteger(limitArgument) &&
  limitArgument > 0
    ? limitArgument
    : TRAILS_PER_RUN

if (isDirectRun(import.meta.url)) {
  enrichTrails(limit).catch((error) => {
    console.error(
      "Elevation enrichment failed:",
      error
    )

    process.exit(1)
  })
}
