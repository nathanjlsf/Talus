import db from "../db/database.js"

import type { Bounds } from "../geo/trailLines.js"

export interface Trail {
  id: number
  name: string
  location: string | null
  park_name: string | null
  park_type: string | null
  park_source: string | null
  description: string | null
  distance_miles: number
  estimated_time_minutes: number
  elevation_gain_feet: number
  elevation_status?: string
  difficulty: string
  difficulty_source: string
  terrain: string
  scenic_score: number | null
  nature_score: number | null
  solitude_score: number | null
  forest_score: number | null
  water_score: number | null
  coastal_score: number | null
  county?: string | null
  source?: string | null
  source_id?: string | null
  created_at: string
}

export function getAllTrails(): Trail[] {
  return db
    .prepare(
      `
      SELECT *
      FROM trails
      ORDER BY name ASC
      `
    )
    .all() as Trail[]
}

export const DEFAULT_TRAIL_LIMIT = 200
export const MAX_TRAIL_LIMIT = 500

export function clampTrailLimit(
  value?: number
): number {
  if (
    value === undefined ||
    !Number.isInteger(value) ||
    value <= 0
  ) {
    return DEFAULT_TRAIL_LIMIT
  }

  return Math.min(value, MAX_TRAIL_LIMIT)
}

export function searchTrails(filters: {
  search?: string | undefined
  location?: string | undefined
  county?: string | undefined
  difficulty?: string | undefined
  maxDistance?: number | undefined
  maxElevation?: number | undefined
  bounds?: Bounds | null | undefined
  limit?: number | undefined
}): Trail[] {
  const conditions: string[] = []
  const parameters: (string | number)[] = []

  if (filters.search?.trim()) {
    const query = `%${filters.search.trim()}%`

    conditions.push(`
      (
        trails.name LIKE ?
        OR trails.location LIKE ?
        OR trails.county LIKE ?
        OR trails.description LIKE ?
      )
    `)

    parameters.push(query, query, query, query)
  }

  if (filters.location?.trim()) {
    conditions.push("trails.location LIKE ?")
    parameters.push(`%${filters.location.trim()}%`)
  }

  if (filters.county?.trim()) {
    conditions.push("trails.county = ?")
    parameters.push(filters.county.trim())
  }

  if (filters.difficulty) {
    conditions.push("trails.difficulty = ?")
    parameters.push(filters.difficulty)
  }

  if (filters.maxDistance !== undefined) {
    conditions.push("trails.distance_miles <= ?")
    parameters.push(filters.maxDistance)
  }

  if (filters.maxElevation !== undefined) {
    conditions.push("trails.elevation_gain_feet <= ?")
    parameters.push(filters.maxElevation)
  }

  if (filters.bounds) {
    conditions.push(`
      trail_bounds.max_latitude >= ?
      AND trail_bounds.min_latitude <= ?
      AND trail_bounds.max_longitude >= ?
      AND trail_bounds.min_longitude <= ?
    `)

    parameters.push(
      filters.bounds.minLatitude,
      filters.bounds.maxLatitude,
      filters.bounds.minLongitude,
      filters.bounds.maxLongitude
    )
  }

  const whereClause =
    conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : ""

  const joinClause = filters.bounds
    ? `
      JOIN trail_bounds
        ON trail_bounds.trail_id = trails.id
    `
    : ""

  parameters.push(clampTrailLimit(filters.limit))

  return db
    .prepare(
      `
      SELECT trails.*
      FROM trails
      ${joinClause}
      ${whereClause}
      ORDER BY trails.name ASC
      LIMIT ?
      `
    )
    .all(...parameters) as Trail[]
}

export function getLatestTrailCounty(
  userId: number
): string | null {
  const row = db
    .prepare(
      `
      SELECT trails.county AS county
      FROM activities
      JOIN trails
        ON trails.id = activities.trail_id
      WHERE activities.user_id = ?
        AND trails.county IS NOT NULL
      ORDER BY activities.id DESC
      LIMIT 1
      `
    )
    .get(userId) as
      | { county: string }
      | undefined

  return row?.county ?? null
}

export function getTrailsForUserSignals(
  userId: number
): Trail[] {
  return db
    .prepare(
      `
      SELECT *
      FROM trails
      WHERE id IN (
        SELECT winner_trail_id
        FROM preference_comparisons
        WHERE user_id = ?

        UNION

        SELECT loser_trail_id
        FROM preference_comparisons
        WHERE user_id = ?

        UNION

        SELECT trail_id
        FROM activities
        WHERE user_id = ?
      )
      `
    )
    .all(userId, userId, userId) as Trail[]
}

export function getTrailById(id: number): Trail | undefined {
  return db
    .prepare(
      `
      SELECT *
      FROM trails
      WHERE id = ?
      `
    )
    .get(id) as Trail | undefined
}

export function createTrail(trail: {
  name: string
  location?: string | null
  park_name?:string | null
  park_type?:string | null
  park_source?:string | null
  description?: string | null
  distance_miles: number
  estimated_time_minutes: number
  elevation_gain_feet: number
  difficulty: string
  difficulty_source: string
  terrain: string
  scenic_score?: number | null
  nature_score?: number | null
  solitude_score?: number | null
  water_score?: number | null
  source?: string
  source_id?: string
  county?: string | null
}): Trail {
  const statement = db.prepare(
    `
    INSERT INTO trails (
      name,
      location,
      park_name,
      park_type,
      park_source,
      description,
      distance_miles,
      estimated_time_minutes,
      elevation_gain_feet,
      difficulty,
      difficulty_source,
      terrain,
      scenic_score,
      nature_score,
      solitude_score,
      water_score,
      source,
      source_id,
      county
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  )

  const result = statement.run(
    trail.name,
    trail.location ?? null,
    trail.park_name ?? null,
    trail.park_type ?? null,
    trail.park_source ?? null,
    trail.description ?? null,
    trail.distance_miles,
    trail.estimated_time_minutes,
    trail.elevation_gain_feet,
    trail.difficulty,
    trail.difficulty_source,
    trail.terrain,
    trail.scenic_score ?? null,
    trail.nature_score ?? null,
    trail.solitude_score ?? null,
    trail.water_score ?? null,
    trail.source ?? null,
    trail.source_id ?? null,
    trail.county?? null
  )

  return getTrailById(Number(result.lastInsertRowid))!
}

export function deleteTrail(id: number): boolean {
  const result = db
    .prepare(
      `
      DELETE FROM trails
      WHERE id = ?
      `
    )
    .run(id)

  return result.changes > 0
}

export function upsertTrail(trail: {
  name: string
  location?: string | null
  park_name?: string | null
  park_type?: string | null
  park_source?: string | null
  description?: string | null
  distance_miles: number
  estimated_time_minutes: number
  elevation_gain_feet: number
  difficulty: string,
  difficulty_source: string,
  terrain: string
  scenic_score?: number | null
  nature_score?: number | null
  solitude_score?: number | null
  water_score?: number | null
  source: string
  source_id: string
  county?: string | null
}): {
  trail: Trail
  created: boolean
} {
  const existing = db
    .prepare(
      `
      SELECT id
      FROM trails
      WHERE source = ?
        AND source_id = ?
      `
    )
    .get(
      trail.source,
      trail.source_id
    ) as { id: number } | undefined

  if (existing) {
    db.prepare(
      `
      UPDATE trails
      SET
        name = ?,
        location = ?,
        description = ?,
        distance_miles = ?,
        estimated_time_minutes = ?,
        difficulty = ?,
        difficulty_source = ?,
        terrain = ?,
        scenic_score = ?,
        nature_score = ?,
        solitude_score = ?,
        water_score = ?,
        county = ?
      WHERE id = ?
      `
    ).run(
      trail.name,
      trail.location ?? null,
      trail.description ?? null,
      trail.distance_miles,
      trail.estimated_time_minutes,
      trail.difficulty,
      trail.difficulty_source,
      trail.terrain,
      trail.scenic_score ?? null,
      trail.nature_score ?? null,
      trail.solitude_score ?? null,
      trail.water_score ?? null,
      trail.county ?? null,
      existing.id
    )

    return {
      trail: getTrailById(existing.id)!,
      created: false,
    }
  }

  return {
    trail: createTrail(trail),
    created: true,
  }
}

export function upsertOsmTrail(trail: {
  name: string
  location?: string | null
  description?: string | null
  distance_miles: number
  estimated_time_minutes: number
  elevation_gain_feet: number
  difficulty: string
  difficulty_source: string
  terrain: string
  scenic_score?: number | null
  nature_score?: number | null
  solitude_score?: number | null
  water_score?: number | null
  source: string
  source_id: string
  county?: string | null
}): {
  trail: Trail
  created: boolean
} {
  const existing = db
    .prepare(
      `
      SELECT id, difficulty, difficulty_source
      FROM trails
      WHERE source = ?
        AND source_id = ?
      `
    )
    .get(
      trail.source,
      trail.source_id
    ) as
      | {
          id: number
          difficulty: string
          difficulty_source: string
        }
      | undefined

  if (!existing) {
    return {
      trail: createTrail(trail),
      created: true,
    }
  }

  const keepDifficulty =
    trail.difficulty_source !== "osm" &&
    existing.difficulty !== "Unknown"

  db.prepare(
    `
    UPDATE trails
    SET
      name = ?,
      distance_miles = ?,
      estimated_time_minutes = ?,
      terrain = ?,
      county = ?,
      difficulty = ?,
      difficulty_source = ?
    WHERE id = ?
    `
  ).run(
    trail.name,
    trail.distance_miles,
    trail.estimated_time_minutes,
    trail.terrain,
    trail.county ?? null,
    keepDifficulty
      ? existing.difficulty
      : trail.difficulty,
    keepDifficulty
      ? existing.difficulty_source
      : trail.difficulty_source,
    existing.id
  )

  return {
    trail: getTrailById(existing.id)!,
    created: false,
  }
}

export function updateTrailElevationGain(
  trailId: number,
  elevationGainFeet: number
): void {
  db.prepare(
    `
    UPDATE trails
    SET elevation_gain_feet = ?
    WHERE id = ?
    `
  ).run(
    Math.max(
      0,
      Math.round(
        elevationGainFeet
      )
    ),
    trailId
  )
}
