import type { OsmWay } from "./overpass.js"

export interface NormalizedTrail {
  source: "openstreetmap"
  source_id: string
  name: string
  location: string | null
  description: string | null
  distance_miles: number
  estimated_time_minutes: number
  elevation_gain_feet: number
  difficulty: string
  terrain: string
  scenic_score: number | null
  nature_score: number | null
  solitude_score: number | null
  water_score: number | null
}

const VALID_HIGHWAYS = new Set([
  "path",
  "track",
  "bridleway",
])

function calculateDistanceMiles(
  geometry: NonNullable<OsmWay["geometry"]>
): number {
  let meters = 0

  for (let i = 1; i < geometry.length; i++) {
    const previous = geometry[i - 1]!
    const current = geometry[i]!

    const lat1 =
      (previous.lat * Math.PI) / 180

    const lat2 =
      (current.lat * Math.PI) / 180

    const deltaLat =
      ((current.lat - previous.lat) *
        Math.PI) /
      180

    const deltaLon =
      ((current.lon - previous.lon) *
        Math.PI) /
      180

    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(deltaLon / 2) ** 2

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      )

    meters += 6371000 * c
  }

  return meters / 1609.344
}

function normalizeTerrain(
  surface?: string
): string {
  if (!surface) {
    return "Unknown"
  }

  const normalized =
    surface.toLowerCase()

  if (
    normalized.includes("paved") ||
    normalized.includes("asphalt") ||
    normalized.includes("concrete")
  ) {
    return "Paved"
  }

  if (
    normalized.includes("rock") ||
    normalized.includes("stone")
  ) {
    return "Rocky"
  }

  if (
    normalized.includes("gravel") ||
    normalized.includes("fine_gravel") ||
    normalized.includes("compacted")
  ) {
    return "Gravel"
  }

  if (
    normalized.includes("dirt") ||
    normalized.includes("ground") ||
    normalized.includes("earth") ||
    normalized.includes("unpaved")
  ) {
    return "Dirt"
  }

  return "Unknown"
}

export function normalizeOsmWay(
  way: OsmWay
): NormalizedTrail | null {
  const name = way.tags?.name
  const highway = way.tags?.highway

  if (!name) {
    return null
  }

  if (
    !highway ||
    !VALID_HIGHWAYS.has(highway)
  ) {
    return null
  }

  if (
    !way.geometry ||
    way.geometry.length < 2
  ) {
    return null
  }

  const distanceMiles =
    calculateDistanceMiles(
      way.geometry
    )

  if (distanceMiles < 0.1) {
    return null
  }

  return {
    source: "openstreetmap",
    source_id: String(way.id),
    name,
    location: null,
    description: null,
    distance_miles:
      Number(distanceMiles.toFixed(2)),
    estimated_time_minutes: Math.max(
      1,
      Math.round(distanceMiles * 30)
    ),
    elevation_gain_feet: 0,
    difficulty: "Unknown",
    terrain: normalizeTerrain(
      way.tags?.surface
    ),
    scenic_score: null,
    nature_score: null,
    solitude_score: null,
    water_score: null,
  }
}
