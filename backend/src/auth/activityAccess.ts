export function activityOwnedByUser(
  activity: { user_id: number } | undefined,
  userId: number
): boolean {
  return activity?.user_id === userId
}
