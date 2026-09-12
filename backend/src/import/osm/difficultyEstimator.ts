export type EstimatedDifficulty =
  | "Easy"
  | "Moderate"
  | "Hard"

export interface DifficultyInput {
  distance_miles: number
  elevation_gain_feet: number
  terrain: string
}

export interface DifficultyEstimate {
  difficulty: EstimatedDifficulty
  score: number
}

function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.max(
    min,
    Math.min(max, value)
  )
}

function elevationPerMileScore(
  distanceMiles: number,
  elevationGainFeet: number
): number {
  if (distanceMiles <= 0) {
    return 0
  }

  const gainPerMile =
    elevationGainFeet /
    distanceMiles

  return clamp(
    gainPerMile / 800,
    0,
    1
  )
}

function elevationScore(
  elevationGainFeet: number
): number {
  return clamp(
    elevationGainFeet / 1000,
    0,
    1
  )
}

function distanceScore(
  distanceMiles: number
): number {
  return clamp(
    distanceMiles / 8,
    0,
    1
  )
}

function terrainScore(
  terrain: string
): number {
  switch (terrain.toLowerCase()) {
    case "rocky":
      return 1

    case "dirt":
      return 0.5

    case "gravel":
      return 0.25

    case "paved":
      return 0

    default:
      return 0.25
  }
}

export function estimateDifficulty(
  input: DifficultyInput
): DifficultyEstimate {
  const elevationPerMile =
    elevationPerMileScore(
      input.distance_miles,
      input.elevation_gain_feet
    )

  const elevation =
    elevationScore(
      input.elevation_gain_feet
    )

  const distance =
    distanceScore(
      input.distance_miles
    )

  const terrain =
    terrainScore(
      input.terrain
    )

  /*
   * Elevation per mile is the strongest signal.
   * Total gain provides additional context.
   * Distance captures long hikes.
   * Terrain provides a small supporting signal.
   */
  const score =
    elevationPerMile * 1.5 +
    elevation * 1.0 +
    distance * 0.5 +
    terrain * 0.25

  let difficulty:
    EstimatedDifficulty

  if (score >= 1.95) {
    difficulty = "Hard"
  } else if (score >= 1.15) {
    difficulty = "Moderate"
  } else {
    difficulty = "Easy"
  }

  return {
    difficulty,
    score: Number(
      score.toFixed(2)
    ),
  }
}
