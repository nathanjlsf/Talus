import db from "../db/database.js"

export interface Experience {
  id: number
  activity_id: number
  overall_rating: number
  scenic_rating: number | null
  difficulty_rating: number | null
  solitude_rating: number | null
  notes: string | null
  created_at: string
}

export function createExperience(experience: {
  activity_id: number
  overall_rating: number
  scenic_rating?: number
  difficulty_rating?: number
  solitude_rating?: number
  notes?: string
}): Experience {
  const statement = db.prepare(
    `
    INSERT INTO experiences (
      activity_id,
      overall_rating,
      scenic_rating,
      difficulty_rating,
      solitude_rating,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `
  )

  const result = statement.run(
    experience.activity_id,
    experience.overall_rating,
    experience.scenic_rating ?? null,
    experience.difficulty_rating ?? null,
    experience.solitude_rating ?? null,
    experience.notes ?? null
  )

  return db
    .prepare(
      `
      SELECT *
      FROM experiences
      WHERE id = ?
      `
    )
    .get(Number(result.lastInsertRowid)) as Experience
}

export function getExperienceForActivity(
  activityId: number
): Experience | undefined {
  return db
    .prepare(
      `
      SELECT *
      FROM experiences
      WHERE activity_id = ?
      `
    )
    .get(activityId) as Experience | undefined
}