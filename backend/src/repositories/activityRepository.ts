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

export interface ActivityWithTrail extends Activity {
  trail: {
    id: number
    name: string
    location: string | null
  }
  experience: {
    id: number
    overall_rating: number
    scenic_rating: number | null
    difficulty_rating: number | null
    solitude_rating: number | null
    notes: string | null
  } | null
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
): ActivityWithTrail[] {
  const rows = db
    .prepare(
      `
      SELECT
        activities.id,
        activities.user_id,
        activities.trail_id,
        activities.started_at,
        activities.ended_at,
        activities.distance_miles,
        activities.elevation_gain_feet,
        activities.duration_seconds,
        activities.created_at,
        trails.name AS trail_name,
        trails.location AS trail_location,
        experiences.id AS experience_id,
        experiences.overall_rating,
        experiences.scenic_rating,
        experiences.difficulty_rating,
        experiences.solitude_rating,
        experiences.notes
      FROM activities
      JOIN trails
        ON trails.id = activities.trail_id
      LEFT JOIN experiences
        ON experiences.activity_id = activities.id
      WHERE activities.user_id = ?
      ORDER BY activities.created_at DESC
      `
    )
    .all(userId) as Array<
      Activity & {
        trail_name: string
        trail_location: string | null
        experience_id: number | null
        overall_rating: number | null
        scenic_rating: number | null
        difficulty_rating: number | null
        solitude_rating: number | null
        notes: string | null
      }
    >

  return rows.map((activity) => ({
    id: activity.id,
    user_id: activity.user_id,
    trail_id: activity.trail_id,
    started_at: activity.started_at,
    ended_at: activity.ended_at,
    distance_miles: activity.distance_miles,
    elevation_gain_feet: activity.elevation_gain_feet,
    duration_seconds: activity.duration_seconds,
    created_at: activity.created_at,

    trail: {
      id: activity.trail_id,
      name: activity.trail_name,
      location: activity.trail_location,
    },

    experience: activity.experience_id
      ? {
          id: activity.experience_id,
          overall_rating: activity.overall_rating!,
          scenic_rating: activity.scenic_rating,
          difficulty_rating: activity.difficulty_rating,
          solitude_rating: activity.solitude_rating,
          notes: activity.notes,
        }
      : null,
  }))
}

export function getActivityById(
  activityId: number
): Activity | undefined {
  return db
    .prepare(
      `
      SELECT *
      FROM activities
      WHERE id = ?
      `
    )
    .get(activityId) as Activity | undefined
}
