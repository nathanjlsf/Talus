import {
  createUser,
  getUserBySupabaseId,
  type User,
} from "../repositories/userRepository.js"

export function registerUser(
  name: string,
  supabaseUserId: string,
): User {
  const existingUser = getUserBySupabaseId(supabaseUserId)

  if (existingUser) {
    return existingUser
  }

  return createUser(name, supabaseUserId)
}

export function findUserBySupabaseId(
  supabaseUserId: string,
): User | undefined {
  return getUserBySupabaseId(supabaseUserId)
}
