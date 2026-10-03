export function trailPlace(trail: {
  park_name?: string | null
  location?: string | null
  county?: string | null
}): string | null {
  return (
    trail.park_name ||
    trail.location ||
    trail.county ||
    null
  )
}

export function trailMetaLine(trail: {
  park_name?: string | null
  location?: string | null
  county?: string | null
  distance_miles: number
  difficulty: string
}): string {
  const difficulty =
    trail.difficulty.toLowerCase() === "unknown"
      ? null
      : trail.difficulty

  return [
    trailPlace(trail),
    `${trail.distance_miles.toFixed(1)} mi`,
    difficulty,
  ]
    .filter((part) => part)
    .join(" · ")
}
