import db from "../db/database.js"

export interface Activity {
  id: number
  user_id: number
  trail_id: number
  started_at: string | null
  ended_at: string | null
  status: string | null
  distance_miles: number | null
  elevation_gain_feet: number | null
  duration_seconds: number | null
  moving_seconds: number | null
  pace_seconds_per_mile: number | null
  completion_fraction: number | null
  turned_around: number | null
  long_stop_count: number | null
  view_moments: number | null
  climb_moments: number | null
  rest_moments: number | null
  elevation_profile: string | null
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
    status: null,
    distance_miles: activity.distance_miles,
    elevation_gain_feet: activity.elevation_gain_feet,
    duration_seconds: activity.duration_seconds,
    moving_seconds: null,
    pace_seconds_per_mile: null,
    completion_fraction: null,
    turned_around: null,
    long_stop_count: null,
    view_moments: null,
    climb_moments: null,
    rest_moments: null,
    elevation_profile: null,
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

export function getActivityWithTrailById(
  activityId: number
): ActivityWithTrail | undefined {
  const row = db
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
        trails.location AS trail_location
      FROM activities
      JOIN trails
        ON trails.id = activities.trail_id
      WHERE activities.id = ?
      `
    )
    .get(activityId) as
    | (Activity & {
        trail_name: string
        trail_location: string | null
      })
    | undefined

  if (!row) {
    return undefined
  }

  return {
    id: row.id,
    user_id: row.user_id,
    trail_id: row.trail_id,
    started_at: row.started_at,
    ended_at: row.ended_at,
    status: null,
    distance_miles: row.distance_miles,
    elevation_gain_feet: row.elevation_gain_feet,
    duration_seconds: row.duration_seconds,
    moving_seconds: null,
    pace_seconds_per_mile: null,
    completion_fraction: null,
    turned_around: null,
    long_stop_count: null,
    view_moments: null,
    climb_moments: null,
    rest_moments: null,
    elevation_profile: null,
    created_at: row.created_at,

    trail: {
      id: row.trail_id,
      name: row.trail_name,
      location: row.trail_location,
    },

    experience: null,
  }
}

export interface RecordingResult {
  ended_at: string
  distance_miles: number
  elevation_gain_feet: number | null
  duration_seconds: number
  moving_seconds: number
  pace_seconds_per_mile: number | null
  completion_fraction: number | null
  turned_around: boolean
  long_stop_count: number
  view_moments: number
  climb_moments: number
  rest_moments: number
  elevation_profile: string
}

export function markActivityRecording(
  activityId: number
): void {
  db.prepare(
    `
    UPDATE activities
    SET status = 'recording'
    WHERE id = ?
    `
  ).run(activityId)
}

export function saveRecordingResult(
  activityId: number,
  result: RecordingResult
): void {
  db.prepare(
    `
    UPDATE activities
    SET
      status = 'finished',
      ended_at = ?,
      distance_miles = ?,
      elevation_gain_feet = ?,
      duration_seconds = ?,
      moving_seconds = ?,
      pace_seconds_per_mile = ?,
      completion_fraction = ?,
      turned_around = ?,
      long_stop_count = ?,
      view_moments = ?,
      climb_moments = ?,
      rest_moments = ?,
      elevation_profile = ?
    WHERE id = ?
    `
  ).run(
    result.ended_at,
    result.distance_miles,
    result.elevation_gain_feet,
    result.duration_seconds,
    result.moving_seconds,
    result.pace_seconds_per_mile,
    result.completion_fraction,
    result.turned_around ? 1 : 0,
    result.long_stop_count,
    result.view_moments,
    result.climb_moments,
    result.rest_moments,
    result.elevation_profile,
    activityId
  )
}

export interface RecordedHikeRow {
  completion_fraction: number
  turned_around: number | null
  pace_seconds_per_mile: number | null
  long_stop_count: number | null
  view_moments: number | null
  climb_moments: number | null
  rest_moments: number | null
  distance_miles: number
  elevation_gain_feet: number
  elevation_status: string | null
  difficulty: string
  terrain: string | null
  scenic_score: number | null
  nature_score: number | null
  solitude_score: number | null
  forest_score: number | null
  water_score: number | null
  coastal_score: number | null
  estimated_time_minutes: number
}

export function listRecordedHikeRows(
  userId: number
): RecordedHikeRow[] {
  return db
    .prepare(
      `
      SELECT
        activities.completion_fraction,
        activities.turned_around,
        activities.pace_seconds_per_mile,
        activities.long_stop_count,
        activities.view_moments,
        activities.climb_moments,
        activities.rest_moments,
        trails.distance_miles,
        trails.elevation_gain_feet,
        trails.elevation_status,
        trails.difficulty,
        trails.terrain,
        trails.scenic_score,
        trails.nature_score,
        trails.solitude_score,
        trails.forest_score,
        trails.water_score,
        trails.coastal_score,
        trails.estimated_time_minutes
      FROM activities
      JOIN trails
        ON trails.id = activities.trail_id
      WHERE activities.user_id = ?
        AND activities.completion_fraction IS NOT NULL
      `
    )
    .all(userId) as RecordedHikeRow[]
}

export interface HikedTrailRow {
  trailId: number
  latestAt: string
  name: string
  location: string | null
  distance_miles: number
  elevation_gain_feet: number
}

export function listHikedTrails(
  userId: number,
  excludeTrailId: number
): HikedTrailRow[] {
  return db
    .prepare(
      `
      SELECT
        trails.id AS trailId,
        MAX(COALESCE(activities.started_at, activities.created_at)) AS latestAt,
        trails.name,
        trails.location,
        trails.distance_miles,
        trails.elevation_gain_feet
      FROM activities
      JOIN trails
        ON trails.id = activities.trail_id
      WHERE activities.user_id = ?
        AND trails.id != ?
      GROUP BY trails.id
      `
    )
    .all(userId, excludeTrailId) as HikedTrailRow[]
}
