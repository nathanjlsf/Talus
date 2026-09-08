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

export interface ExperienceWithTrail extends Experience {
  trail: {
    id: number
    distance_miles: number
    elevation_gain_feet: number
    difficulty: string
    terrain: string | null
    scenic_score: number | null
    nature_score: number | null
    solitude_score: number | null
  }
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

export function getExperiencesForUser(
  userId: number
): ExperienceWithTrail[] {
  const rows = db
    .prepare(
      `
      SELECT
        experiences.id,
        experiences.activity_id,
        experiences.overall_rating,
        experiences.scenic_rating,
        experiences.difficulty_rating,
        experiences.solitude_rating,
        experiences.notes,
        experiences.created_at,
        trails.id AS trail_id,
        trails.distance_miles,
        trails.elevation_gain_feet,
        trails.difficulty,
        trails.terrain,
        trails.scenic_score,
        trails.nature_score,
        trails.solitude_score
      FROM experiences
      JOIN activities
        ON activities.id = experiences.activity_id
      JOIN trails
        ON trails.id = activities.trail_id
      WHERE activities.user_id = ?
      ORDER BY experiences.created_at DESC
      `
    )
    .all(userId) as Array<
      Experience & {
        trail_id: number
        distance_miles: number
        elevation_gain_feet: number
        difficulty: string
        terrain: string | null
        scenic_score: number | null
        nature_score: number | null
        solitude_score: number | null
      }
    >

  return rows.map((experience) => ({
    id: experience.id,
    activity_id: experience.activity_id,
    overall_rating: experience.overall_rating,
    scenic_rating: experience.scenic_rating,
    difficulty_rating: experience.difficulty_rating,
    solitude_rating: experience.solitude_rating,
    notes: experience.notes,
    created_at: experience.created_at,
    trail: {
      id: experience.trail_id,
      distance_miles: experience.distance_miles,
      elevation_gain_feet:
        experience.elevation_gain_feet,
      difficulty: experience.difficulty,
      terrain: experience.terrain,
      scenic_score: experience.scenic_score,
      nature_score: experience.nature_score,
      solitude_score: experience.solitude_score,
    },
  }))
}
