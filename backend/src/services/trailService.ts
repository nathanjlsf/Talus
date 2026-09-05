import {
  createTrail,
  deleteTrail,
  getAllTrails,
  getTrailById,
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
  elevation_gain_feet: number
  difficulty: string
  scenic_score?: number
  forest_score?: number
  coastal_score?: number
  solitude_score?: number
}): Trail {
  return createTrail(input)
}

export function removeTrail(id: number): boolean {
  return deleteTrail(id)
}