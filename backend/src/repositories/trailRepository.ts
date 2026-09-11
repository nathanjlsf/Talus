import db from "../db/database.js"

export interface Trail {
  id: number
  name: string
  location: string | null
  description: string | null
  distance_miles: number
  estimated_time_minutes: number
  elevation_gain_feet: number
  difficulty: string
  terrain: string
  scenic_score: number | null
  nature_score: number | null
  solitude_score: number | null
  water_score: number | null
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

export function searchTrails(filters: {
  search?: string | undefined
  difficulty?: string | undefined
  maxDistance?: number | undefined
  maxElevation?: number | undefined
}): Trail[] {
  const conditions: string[] = []
  const parameters: (string | number)[] = []

  if (filters.search?.trim()) {
    const query = `%${filters.search.trim()}%`

    conditions.push(`
      (
        name LIKE ?
        OR location LIKE ?
        OR description LIKE ?
      )
    `)

    parameters.push(query, query, query)
  }

  if (filters.difficulty) {
    conditions.push("difficulty = ?")
    parameters.push(filters.difficulty)
  }

  if (filters.maxDistance !== undefined) {
    conditions.push("distance_miles <= ?")
    parameters.push(filters.maxDistance)
  }

  if (filters.maxElevation !== undefined) {
    conditions.push("elevation_gain_feet <= ?")
    parameters.push(filters.maxElevation)
  }

  const whereClause =
    conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : ""

  return db
    .prepare(
      `
      SELECT *
      FROM trails
      ${whereClause}
      ORDER BY name ASC
      `
    )
    .all(...parameters) as Trail[]
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
  description?: string | null
  distance_miles: number
  estimated_time_minutes: number
  elevation_gain_feet: number
  difficulty: string
  terrain: string
  scenic_score?: number | null
  nature_score?: number | null
  solitude_score?: number | null
  water_score?: number | null
  source?: string
  source_id?: string
}): Trail {
  const statement = db.prepare(
    `
    INSERT INTO trails (
      name,
      location,
      description,
      distance_miles,
      estimated_time_minutes,
      elevation_gain_feet,
      difficulty,
      terrain,
      scenic_score,
      nature_score,
      solitude_score,
      water_score,
      source,
      source_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  )

  const result = statement.run(
    trail.name,
    trail.location ?? null,
    trail.description ?? null,
    trail.distance_miles,
    trail.estimated_time_minutes,
    trail.elevation_gain_feet,
    trail.difficulty,
    trail.terrain,
    trail.scenic_score ?? null,
    trail.nature_score ?? null,
    trail.solitude_score ?? null,
    trail.water_score ?? null,
    trail.source ?? null,
    trail.source_id ?? null
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
  description?: string | null
  distance_miles: number
  estimated_time_minutes: number
  elevation_gain_feet: number
  difficulty: string
  terrain: string
  scenic_score?: number | null
  nature_score?: number | null
  solitude_score?: number | null
  water_score?: number | null
  source: string
  source_id: string
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
        elevation_gain_feet = ?,
        difficulty = ?,
        terrain = ?,
        scenic_score = ?,
        nature_score = ?,
        solitude_score = ?,
        water_score = ?
      WHERE id = ?
      `
    ).run(
      trail.name,
      trail.location ?? null,
      trail.description ?? null,
      trail.distance_miles,
      trail.estimated_time_minutes,
      trail.elevation_gain_feet,
      trail.difficulty,
      trail.terrain,
      trail.scenic_score ?? null,
      trail.nature_score ?? null,
      trail.solitude_score ?? null,
      trail.water_score ?? null,
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
