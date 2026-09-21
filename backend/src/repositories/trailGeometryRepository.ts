import db from "../db/database.js"

export interface TrailGeometryPoint {
  way_id: number
  sequence: number
  latitude: number
  longitude: number
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
      ORDER BY sequence
      `
    )
    .all(trailId) as TrailGeometryPoint[]
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
