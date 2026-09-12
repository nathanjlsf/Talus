import {
  createTrail,
  deleteTrail,
  getAllTrails,
  getTrailById,
  searchTrails,
  type Trail,
} from "../repositories/trailRepository.js"

export function listTrails(): Trail[] {
  return getAllTrails()
}

export function findTrail(id: number): Trail | undefined {
  return getTrailById(id)
}

export function addTrail(input: {
  name: string
  location?: string
  description?: string
  distance_miles: number
  estimated_time_minutes: number
  elevation_gain_feet: number
  difficulty: string
  difficulty_source: string
  terrain: string
  scenic_score?: number
  nature_score?: number
  solitude_score?: number
  water_score?: number
}): Trail {
  return createTrail(input)
}

export function removeTrail(id: number): boolean {
  return deleteTrail(id)
}

export function searchTrailList(filters: {
  search?: string | undefined
  difficulty?: string | undefined
  maxDistance?: number | undefined
  maxElevation?: number | undefined
}): Trail[] {
  return searchTrails(filters)
}
