export interface RankedTrail {
  trailId: number
  score: number
}

export interface Comparison {
  winnerTrailId: number
  loserTrailId: number
}

export interface RankingResult {
  rank: number
  trail: {
    id: number
    name: string
    location: string | null
    description: string | null
    distance_miles: number
    estimated_time_minutes: number | null
    elevation_gain_feet: number
    difficulty: string
    terrain: string | null
    scenic_score: number | null
    nature_score: number | null
    solitude_score: number | null
    water_score: number | null
  }
  score: number
}
