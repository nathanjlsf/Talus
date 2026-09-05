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
    elevation_gain_feet: number
    difficulty: string
  }
  score: number
}