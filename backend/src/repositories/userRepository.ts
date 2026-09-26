import db from "../db/database.js"

export interface User {
  id: number
  name: string
  supabase_user_id: string
  created_at: string
}

export function createUser(
  name: string,
  supabaseUserId: string,
): User {
  const result = db
    .prepare(
      `
      INSERT INTO users (name, supabase_user_id)
      VALUES (?, ?)
      `,
    )
    .run(name, supabaseUserId)

  return getUserBySupabaseId(supabaseUserId)!
}

export function getUserBySupabaseId(
  supabaseUserId: string,
): User | undefined {
  return db
    .prepare(
      `
      SELECT id, name, supabase_user_id, created_at
      FROM users
      WHERE supabase_user_id = ?
      `,
    )
    .get(supabaseUserId) as User | undefined
}
