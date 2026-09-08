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
  location?: string
  description?: string
  distance_miles: number
  estimated_time_minutes: number
  elevation_gain_feet: number
  difficulty: string
  terrain: string
  scenic_score?: number
  nature_score?: number
  solitude_score?: number
  water_score?: number
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
      water_score
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    trail.water_score ?? null
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
