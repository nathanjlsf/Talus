import db from "../db/database.js"

export interface Activity {
  id: number
  user_id: number
  trail_id: number
  started_at: string | null
  ended_at: string | null
  distance_miles: number | null
  elevation_gain_feet: number | null
  duration_seconds: number | null
  created_at: string
}

export function createActivity(activity: {
  user_id: number
  trail_id: number
  started_at?: string
  ended_at?: string
  distance_miles?: number
  elevation_gain_feet?: number
  duration_seconds?: number
}): Activity {
  const statement = db.prepare(
    `
    INSERT INTO activities (
      user_id,
      trail_id,
      started_at,
      ended_at,
      distance_miles,
      elevation_gain_feet,
      duration_seconds
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `
  )

  const result = statement.run(
    activity.user_id,
    activity.trail_id,
    activity.started_at ?? null,
    activity.ended_at ?? null,
    activity.distance_miles ?? null,
    activity.elevation_gain_feet ?? null,
    activity.duration_seconds ?? null
  )

  return db
    .prepare(
      `
      SELECT *
      FROM activities
      WHERE id = ?
      `
    )
    .get(Number(result.lastInsertRowid)) as Activity
}

export function getActivitiesForUser(
  userId: number
): Activity[] {
  return db
    .prepare(
      `
      SELECT *
      FROM activities
      WHERE user_id = ?
      ORDER BY created_at DESC
      `
    )
    .all(userId) as Activity[]
}