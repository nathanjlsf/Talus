import {
  createTrail,
  deleteTrail,
  getLatestTrailCounty,
  getTrailById,
  getTrailsByIds,
  searchTrails,
  type Trail,
} from "../repositories/trailRepository.js"

import type { Bounds } from "../geo/trailLines.js"

export interface TrailScope {
  search?: string | undefined
  location?: string | undefined
  county?: string | undefined
  difficulty?: string | undefined
  maxDistance?: number | undefined
  maxElevation?: number | undefined
  bounds?: Bounds | null | undefined
  limit?: number | null | undefined
}

export function loadScopedTrails(
  userId: number | null,
  scope: TrailScope = {},
  options: {
    fallbackToLatestCounty?: boolean
  } = {}
): Trail[] {
  const fallbackToLatestCounty =
    options.fallbackToLatestCounty !== false

  const county = scope.bounds
    ? undefined
    : scope.county?.trim() ||
      (fallbackToLatestCounty && userId
        ? getLatestTrailCounty(userId) ?? undefined
        : undefined)

  return searchTrails({
    ...scope,
    county,
  })
}

export function listTrails(
  scope: TrailScope = {}
): Trail[] {
  return searchTrails(scope)
}

export function findTrail(id: number): Trail | undefined {
  return getTrailById(id)
}

export function findTrailsByIds(
  ids: number[]
): Trail[] {
  return getTrailsByIds(ids)
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

export function searchTrailList(filters: TrailScope): Trail[] {
  return searchTrails(filters)
}
