import db from "../db/database.js"

import {
  boundsFromPoints,
  groupPointsByWay,
} from "../geo/trailLines.js"

export interface TrailGeometryPoint {
  way_id: number
  sequence: number
  latitude: number
  longitude: number
}

function saveTrailBounds(
  trailId: number,
  points: TrailGeometryPoint[]
) {
  const bounds = boundsFromPoints(points)

  if (!bounds) {
    db.prepare(`
      DELETE FROM trail_bounds
      WHERE trail_id = ?
    `).run(trailId)

    return
  }

  db.prepare(`
    INSERT INTO trail_bounds (
      trail_id,
      min_latitude,
      max_latitude,
      min_longitude,
      max_longitude
    )
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(trail_id)
    DO UPDATE SET
      min_latitude = excluded.min_latitude,
      max_latitude = excluded.max_latitude,
      min_longitude = excluded.min_longitude,
      max_longitude = excluded.max_longitude
  `).run(
    trailId,
    bounds.minLatitude,
    bounds.maxLatitude,
    bounds.minLongitude,
    bounds.maxLongitude
  )
}

export function replaceTrailGeometry(
  trailId: number,
  points: TrailGeometryPoint[]
): void {
  const deleteStatement = db.prepare(
    `
    DELETE FROM trail_geometry
    WHERE trail_id = ?
    `
  )

  const insertStatement = db.prepare(
    `
    INSERT INTO trail_geometry (
      trail_id,
      way_id,
      sequence,
      latitude,
      longitude
    )
    VALUES (?, ?, ?, ?, ?)
    `
  )

  const replace = db.transaction(() => {
    deleteStatement.run(trailId)

    for (const point of points) {
      insertStatement.run(
        trailId,
        point.way_id,
        point.sequence,
        point.latitude,
        point.longitude
      )
    }

    saveTrailBounds(trailId, points)
  })

  replace()
}

export function getTrailGeometry(
  trailId: number
): TrailGeometryPoint[] {
  return db
    .prepare(
      `
      SELECT
        way_id,
        sequence,
        latitude,
        longitude
      FROM trail_geometry
      WHERE trail_id = ?
      ORDER BY way_id, sequence
      `
    )
    .all(trailId) as TrailGeometryPoint[]
}

export function getTrailGeometryLines(
  trailId: number
): TrailGeometryPoint[][] {
  return groupPointsByWay(
    getTrailGeometry(trailId)
  )
}

export function backfillTrailBounds(): number {
  const result = db.prepare(`
    INSERT INTO trail_bounds (
      trail_id,
      min_latitude,
      max_latitude,
      min_longitude,
      max_longitude
    )
    SELECT
      trail_id,
      MIN(latitude),
      MAX(latitude),
      MIN(longitude),
      MAX(longitude)
    FROM trail_geometry
    GROUP BY trail_id
    ON CONFLICT(trail_id) DO UPDATE SET
      min_latitude = excluded.min_latitude,
      max_latitude = excluded.max_latitude,
      min_longitude = excluded.min_longitude,
      max_longitude = excluded.max_longitude
  `).run()

  return result.changes
}

export interface TrailCenterPoint {
  latitude: number
  longitude: number
}

export function getTrailCenter(
  trailId: number
): TrailCenterPoint | null {
  const points = getTrailGeometry(trailId)

  if (points.length === 0) {
    return null
  }

  const totalLatitude =
    points.reduce(
      (sum, point) => sum + point.latitude,
      0
    )

  const totalLongitude =
    points.reduce(
      (sum, point) => sum + point.longitude,
      0
    )

  return {
    latitude:
      totalLatitude / points.length,
    longitude:
      totalLongitude / points.length,
  }
}
