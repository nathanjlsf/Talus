import db from "../db/database.js"

import type {
  UserPreference,
} from "../ranking/preferenceTypes.js"

export function savePreferences(
  userId: number,
  preferences: UserPreference[]
): void {
  const statement = db.prepare(`
    INSERT INTO preferences (
      user_id,
      attribute,
      score,
      confidence,
      updated_at
    )
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, attribute)
    DO UPDATE SET
      score = excluded.score,
      confidence = excluded.confidence,
      updated_at = CURRENT_TIMESTAMP
  `)

  const transaction = db.transaction(
    (items: UserPreference[]) => {
      for (const preference of items) {
        statement.run(
          userId,
          preference.attribute,
          preference.score,
          preference.confidence
        )
      }
    }
  )

  transaction(preferences)
}

export function getPreferencesForUser(
  userId: number
): UserPreference[] {
  const rows = db
    .prepare(`
      SELECT
        attribute,
        score,
        confidence
      FROM preferences
      WHERE user_id = ?
      ORDER BY attribute
    `)
    .all(userId) as UserPreference[]

  return rows
}