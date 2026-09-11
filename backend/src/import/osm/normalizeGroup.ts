import type { TrailGroup } from "./groupTrails.js"

export interface NormalizedTrailGroup {
  name: string
  distance_miles: number
  estimated_time_minutes: number
  elevation_gain_feet: number
  difficulty: string
  terrain: string
  location: string | null
  description: string | null
  scenic_score: number | null
  nature_score: number | null
  solitude_score: number | null
  water_score: number | null
  source: "openstreetmap"
  source_id: string
  operator: string | null
  access: string | null
  relation_ids: number[]
  way_ids: number[]
}

function getTagValues(
  group: TrailGroup,
  key: string
): string[] {
  return group.ways
    .map((way) => way.tags?.[key])
    .filter(
      (
        value
      ): value is string =>
        Boolean(value)
    )
}

function getMostCommonValue(
  values: string[]
): string | null {
  if (values.length === 0) {
    return null
  }

  const counts = new Map<
    string,
    number
  >()

  for (const value of values) {
    const normalized =
      value.trim()

    counts.set(
      normalized,
      (counts.get(normalized) ?? 0) + 1
    )
  }

  return (
    Array.from(counts.entries())
      .sort(
        (a, b) =>
          b[1] - a[1]
      )[0]?.[0] ?? null
  )
}

function getTerrain(
  group: TrailGroup
): string {
  const surfaces =
    getTagValues(
      group,
      "surface"
    )

  if (surfaces.length === 0) {
    return "Unknown"
  }

  const normalized =
    surfaces.map((surface) =>
      surface.toLowerCase()
    )

  if (
    normalized.some(
      (surface) =>
        surface.includes("rock") ||
        surface.includes("stone")
    )
  ) {
    return "Rocky"
  }

  if (
    normalized.some(
      (surface) =>
        surface.includes("paved") ||
        surface.includes("asphalt") ||
        surface.includes("concrete")
    )
  ) {
    return "Paved"
  }

  if (
    normalized.some(
      (surface) =>
        surface.includes("gravel") ||
        surface.includes("fine_gravel") ||
        surface.includes("compacted")
    )
  ) {
    return "Gravel"
  }

  if (
    normalized.some(
      (surface) =>
        surface.includes("dirt") ||
        surface.includes("ground") ||
        surface.includes("earth") ||
        surface.includes("unpaved")
    )
  ) {
    return "Dirt"
  }

  return "Unknown"
}

function createSourceId(
  wayIds: number[]
): string {
  const sortedWayIds =
    [...wayIds].sort(
      (a, b) => a - b
    )

  return sortedWayIds.join(",")
}

export function normalizeTrailGroup(
  group: TrailGroup
): NormalizedTrailGroup {
  const operators =
    getTagValues(
      group,
      "operator"
    )

  const accessValues =
    getTagValues(
      group,
      "access"
    )

  const wayIds =
    group.ways.map(
      (way) => way.id
    )

  return {
    name: group.name,

    distance_miles:
      Number(
        group.distance_miles.toFixed(2)
      ),

    estimated_time_minutes:
      Math.max(
        1,
        Math.round(
          group.distance_miles * 30
        )
      ),

    elevation_gain_feet: 0,

    difficulty: "Unknown",

    terrain:
      getTerrain(group),

    location: null,

    description: null,

    scenic_score: null,

    nature_score: null,

    solitude_score: null,

    water_score: null,

    source:
      "openstreetmap",

    source_id:
      createSourceId(wayIds),

    operator:
      getMostCommonValue(
        operators
      ),

    access:
      getMostCommonValue(
        accessValues
      ),

    relation_ids:
      group.relation_ids,

    way_ids: wayIds,
  }
}
