import db from "../db/database.js"

export interface PreferenceComparison {
  id: number
  user_id: number
  winner_trail_id: number
  loser_trail_id: number
  created_at: string
}

export function createComparison(comparison: {
  user_id: number
  winner_trail_id: number
  loser_trail_id: number
}): PreferenceComparison {
  const statement = db.prepare(
    `
    INSERT INTO preference_comparisons (
      user_id,
      winner_trail_id,
      loser_trail_id
    )
    VALUES (?, ?, ?)
    `
  )

  const result = statement.run(
    comparison.user_id,
    comparison.winner_trail_id,
    comparison.loser_trail_id
  )

  return db
    .prepare(
      `
      SELECT *
      FROM preference_comparisons
      WHERE id = ?
      `
    )
    .get(Number(result.lastInsertRowid)) as PreferenceComparison
}

export function getComparisonsForUser(
  userId: number
): PreferenceComparison[] {
  return db
    .prepare(
      `
      SELECT *
      FROM preference_comparisons
      WHERE user_id = ?
      ORDER BY created_at ASC
      `
    )
    .all(userId) as PreferenceComparison[]
}