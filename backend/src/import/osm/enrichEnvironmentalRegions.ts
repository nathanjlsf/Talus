import db from "../../db/database.js"

import { getTrailGeometryLines } from "../../repositories/trailGeometryRepository.js"

import { enrichEnvironmentalData } from "./enrichEnvironmental.js"
import {
  CELL_DEGREES,
  cellKey,
} from "./hikingWays.js"
import { fetchNearbyEnvironmentalFeatures } from "./overpass.js"

import type { TrailPoint } from "./environmentalScoring.js"

const TRAILS_PER_CELL = 150

function cellBounds(cell: string) {
  const [latitudeIndex, longitudeIndex] =
    cell.split(":").map(Number)

  if (
    latitudeIndex === undefined ||
    longitudeIndex === undefined ||
    Number.isNaN(latitudeIndex) ||
    Number.isNaN(longitudeIndex)
  ) {
    return null
  }

  const padding = 0.01

  return {
    south:
      latitudeIndex * CELL_DEGREES - padding,
    north:
      (latitudeIndex + 1) * CELL_DEGREES +
      padding,
    west:
      longitudeIndex * CELL_DEGREES - padding,
    east:
      (longitudeIndex + 1) * CELL_DEGREES +
      padding,
  }
}

function samplePoints(
  points: TrailPoint[],
  limit = 40
): TrailPoint[] {
  if (points.length <= limit) {
    return points
  }

  const step = (points.length - 1) / (limit - 1)

  return Array.from(
    { length: limit },
    (_, index) =>
      points[Math.round(index * step)]!
  )
}

export async function enrichEnvironmentalRegions(
  cellLimit = 1
): Promise<number> {
  const trails = db
    .prepare(
      `
      SELECT
        trails.id AS id,
        trails.name AS name,
        (trail_bounds.min_latitude + trail_bounds.max_latitude) / 2 AS latitude,
        (trail_bounds.min_longitude + trail_bounds.max_longitude) / 2 AS longitude
      FROM trails
      JOIN trail_bounds
        ON trail_bounds.trail_id = trails.id
      WHERE trails.source = 'openstreetmap'
        AND trails.forest_score IS NULL
      ORDER BY trails.id
      `
    )
    .all() as Array<{
      id: number
      name: string
      latitude: number
      longitude: number
    }>

  const cells = new Map<string, typeof trails>()

  for (const trail of trails) {
    const key = cellKey(
      trail.latitude,
      trail.longitude
    )

    const existing = cells.get(key) ?? []
    existing.push(trail)
    cells.set(key, existing)
  }

  const update = db.prepare(`
    UPDATE trails
    SET
      forest_score = ?,
      water_score = ?,
      coastal_score = ?
    WHERE id = ?
  `)

  let scored = 0
  let processedCells = 0

  for (const [cell, cellTrails] of cells) {
    if (processedCells >= cellLimit) {
      break
    }

    const bounds = cellBounds(cell)

    if (!bounds) {
      continue
    }

    console.log(
      `Fetching environmental features for cell ${cell} (${cellTrails.length} trails)...`
    )

    const features =
      await fetchNearbyEnvironmentalFeatures(
        bounds.south,
        bounds.west,
        bounds.north,
        bounds.east
      )

    const batch = cellTrails.slice(
      0,
      TRAILS_PER_CELL
    )

    for (const trail of batch) {
      const points = samplePoints(
        getTrailGeometryLines(trail.id)
          .flat()
          .map((point) => ({
            lat: point.latitude,
            lon: point.longitude,
          }))
      )

      if (points.length < 2) {
        continue
      }

      const enrichment = enrichEnvironmentalData(
        points,
        features
      )

      update.run(
        enrichment.scores.forest,
        enrichment.scores.water,
        enrichment.scores.coastal,
        trail.id
      )

      scored += 1
    }

    processedCells += 1

    console.log(
      `Scored ${batch.length} trails in cell ${cell}`
    )
  }

  console.log(
    `Environmental enrichment scored ${scored} trails across ${processedCells} cells. ${Math.max(cells.size - processedCells, 0)} cells remain.`
  )

  return scored
}
