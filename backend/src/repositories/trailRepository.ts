import db from "../db/database.js"

export interface Trail {
  id: number
  name: string
  location: string | null
  description: string | null
  distance_miles: number
  elevation_gain_feet: number
  difficulty: string
  scenic_score: number | null
  forest_score: number | null
  coastal_score: number | null
  solitude_score: number | null
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
  elevation_gain_feet: number
  difficulty: string
  scenic_score?: number
  forest_score?: number
  coastal_score?: number
  solitude_score?: number
}): Trail {
  const statement = db.prepare(
    `
    INSERT INTO trails (
      name,
      location,
      description,
      distance_miles,
      elevation_gain_feet,
      difficulty,
      scenic_score,
      forest_score,
      coastal_score,
      solitude_score
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  )

  const result = statement.run(
    trail.name,
    trail.location ?? null,
    trail.description ?? null,
    trail.distance_miles,
    trail.elevation_gain_feet,
    trail.difficulty,
    trail.scenic_score ?? null,
    trail.forest_score ?? null,
    trail.coastal_score ?? null,
    trail.solitude_score ?? null
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