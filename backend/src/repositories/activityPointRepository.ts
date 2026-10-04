import db from "../db/database.js"

import type { MomentMark } from "../ranking/trackStats.js"

export interface ActivityPoint {
  id: number
  activity_id: number
  recorded_at: string
  latitude: number
  longitude: number
  accuracy: number | null
  moment: MomentMark | null
}

export interface ActivityPointInput {
  recorded_at: string
  latitude: number
  longitude: number
  accuracy: number | null
  moment: MomentMark | null
}

export function insertActivityPoints(
  activityId: number,
  points: ActivityPointInput[]
): number {
  const statement = db.prepare(
    `
    INSERT INTO activity_points (
      activity_id,
      recorded_at,
      latitude,
      longitude,
      accuracy,
      moment
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `
  )

  const insert = db.transaction(
    (rows: ActivityPointInput[]) => {
      for (const point of rows) {
        statement.run(
          activityId,
          point.recorded_at,
          point.latitude,
          point.longitude,
          point.accuracy,
          point.moment
        )
      }
    }
  )

  insert(points)

  return points.length
}

export function getActivityPoints(
  activityId: number
): ActivityPoint[] {
  return db
    .prepare(
      `
      SELECT
        id,
        activity_id,
        recorded_at,
        latitude,
        longitude,
        accuracy,
        moment
      FROM activity_points
      WHERE activity_id = ?
      ORDER BY recorded_at ASC, id ASC
      `
    )
    .all(activityId) as ActivityPoint[]
}
