import db from "../db/database.js"

import type { Trail } from "../repositories/trailRepository.js"

import {
  getPreferencesForUser,
} from "../repositories/preferenceRepository.js"

import {
  getTrailGeometryLines,
} from "../repositories/trailGeometryRepository.js"

import {
  calculatePersonalizedScore,
} from "../ranking/personalizedScoring.js"

import {
  generateRecommendationExplanations,
} from "../ranking/recommendationExplanation.js"

import {
  simplifyPath,
  type Bounds,
} from "../geo/trailLines.js"

const MAP_TRAIL_LIMIT = 200
const OVERVIEW_TOLERANCE_DEGREES = 0.00015
const DETAIL_POINT_LIMIT = 1500
const DETAIL_TOLERANCE_DEGREES = 0.00004
const DEFAULT_HALF_SPAN = 0.15

interface BoundedTrail extends Trail {
  min_latitude: number
  max_latitude: number
  min_longitude: number
  max_longitude: number
}

export interface MapFeatureCollection {
  type: "FeatureCollection"
  bounds: [number, number, number, number] | null
  features: MapFeature[]
}

interface MapFeature {
  type: "Feature"
  geometry: {
    type: "MultiLineString"
    coordinates: number[][][]
  }
  properties: {
    id: number
    name: string
    score: number
    reason: string | null
    distance_miles: number
    elevation_gain_feet: number
    difficulty: string
    location: string | null
    park_name: string | null
    county: string | null
  }
}

const boundedTrailQuery = `
  SELECT
    trails.*,
    trail_bounds.min_latitude,
    trail_bounds.max_latitude,
    trail_bounds.min_longitude,
    trail_bounds.max_longitude
  FROM trail_bounds
  JOIN trails
    ON trails.id = trail_bounds.trail_id
`

function trailsInBounds(
  bounds: Bounds
): BoundedTrail[] {
  return db
    .prepare(`
      ${boundedTrailQuery}
      WHERE trail_bounds.max_latitude >= ?
        AND trail_bounds.min_latitude <= ?
        AND trail_bounds.max_longitude >= ?
        AND trail_bounds.min_longitude <= ?
    `)
    .all(
      bounds.minLatitude,
      bounds.maxLatitude,
      bounds.minLongitude,
      bounds.maxLongitude
    ) as BoundedTrail[]
}

function scoredTrails(
  trails: BoundedTrail[],
  userId: number
) {
  const preferences =
    getPreferencesForUser(userId)

  return trails
    .map((trail) => {
      const score =
        calculatePersonalizedScore(
          trail,
          preferences
        )

      const reason =
        generateRecommendationExplanations(
          trail,
          preferences
        )[0]?.message ?? null

      return {
        trail,
        score,
        reason,
      }
    })
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score
      }

      return first.trail.id - second.trail.id
    })
}

function geometryForTrails(
  trailIds: number[]
) {
  if (trailIds.length === 0) {
    return new Map<
      number,
      ReturnType<typeof getTrailGeometryLines>
    >()
  }

  const placeholders = trailIds
    .map(() => "?")
    .join(", ")

  const points = db
    .prepare(`
      SELECT
        trail_id,
        way_id,
        sequence,
        latitude,
        longitude
      FROM trail_geometry
      WHERE trail_id IN (${placeholders})
      ORDER BY trail_id, way_id, sequence
    `)
    .all(...trailIds) as Array<{
      trail_id: number
      way_id: number
      sequence: number
      latitude: number
      longitude: number
    }>

  const byTrail = new Map<
    number,
    typeof points
  >()

  for (const point of points) {
    const line =
      byTrail.get(point.trail_id) ?? []

    line.push(point)
    byTrail.set(point.trail_id, line)
  }

  const linesByTrail = new Map<
    number,
    Array<typeof points>
  >()

  for (const [trailId, trailPoints] of byTrail) {
    const lines: Array<typeof points> = []

    for (const point of trailPoints) {
      const current = lines[lines.length - 1]

      if (
        !current ||
        current[0]?.way_id !== point.way_id
      ) {
        lines.push([point])
      } else {
        current.push(point)
      }
    }

    linesByTrail.set(trailId, lines)
  }

  return linesByTrail
}

function toFeature(
  trail: BoundedTrail,
  score: number,
  reason: string | null,
  lines: Array<
    Array<{
      latitude: number
      longitude: number
    }>
  >,
  tolerance: number
): MapFeature | null {
  const coordinates = lines
    .map((line) =>
      simplifyPath(line, tolerance).map(
        (point) => [
          point.longitude,
          point.latitude,
        ]
      )
    )
    .filter((line) => line.length >= 2)

  if (coordinates.length === 0) {
    return null
  }

  return {
    type: "Feature",
    geometry: {
      type: "MultiLineString",
      coordinates,
    },
    properties: {
      id: trail.id,
      name: trail.name,
      score: Math.round(score),
      reason,
      distance_miles: trail.distance_miles,
      elevation_gain_feet:
        trail.elevation_gain_feet,
      difficulty: trail.difficulty,
      location: trail.location,
      park_name: trail.park_name,
      county: trail.county ?? null,
    },
  }
}

function collectionFor(
  trails: BoundedTrail[],
  userId: number,
  fitBounds: boolean
): MapFeatureCollection {
  const ranked = scoredTrails(
    trails,
    userId
  ).slice(0, MAP_TRAIL_LIMIT)

  const linesByTrail = geometryForTrails(
    ranked.map((item) => item.trail.id)
  )

  const features = ranked.flatMap((item) => {
    const feature = toFeature(
      item.trail,
      item.score,
      item.reason,
      linesByTrail.get(item.trail.id) ?? [],
      OVERVIEW_TOLERANCE_DEGREES
    )

    return feature ? [feature] : []
  })

  let bounds:
    | [number, number, number, number]
    | null = null

  if (fitBounds && ranked.length > 0) {
    let west = Infinity
    let south = Infinity
    let east = -Infinity
    let north = -Infinity

    for (const item of ranked) {
      west = Math.min(
        west,
        item.trail.min_longitude
      )
      south = Math.min(
        south,
        item.trail.min_latitude
      )
      east = Math.max(
        east,
        item.trail.max_longitude
      )
      north = Math.max(
        north,
        item.trail.max_latitude
      )
    }

    bounds = [west, south, east, north]
  }

  return {
    type: "FeatureCollection",
    bounds,
    features,
  }
}

export function getMapTrails(input: {
  userId: number
  bounds: Bounds | null
}): MapFeatureCollection {
  if (input.bounds) {
    return collectionFor(
      trailsInBounds(input.bounds),
      input.userId,
      false
    )
  }

  const trails = db
    .prepare(boundedTrailQuery)
    .all() as BoundedTrail[]

  const best = scoredTrails(
    trails,
    input.userId
  )[0]

  if (!best) {
    return {
      type: "FeatureCollection",
      bounds: null,
      features: [],
    }
  }

  const centerLatitude =
    (best.trail.min_latitude +
      best.trail.max_latitude) /
    2

  const centerLongitude =
    (best.trail.min_longitude +
      best.trail.max_longitude) /
    2

  return collectionFor(
    trailsInBounds({
      minLatitude:
        centerLatitude - DEFAULT_HALF_SPAN,
      maxLatitude:
        centerLatitude + DEFAULT_HALF_SPAN,
      minLongitude:
        centerLongitude - DEFAULT_HALF_SPAN,
      maxLongitude:
        centerLongitude + DEFAULT_HALF_SPAN,
    }),
    input.userId,
    true
  )
}

export function getTrailGeometryFeature(
  trailId: number
): MapFeature | null {
  const lines = getTrailGeometryLines(trailId)

  if (lines.length === 0) {
    return null
  }

  const coordinates = lines
    .map((line) => {
      const simplified =
        line.length > DETAIL_POINT_LIMIT
          ? simplifyPath(
              line,
              DETAIL_TOLERANCE_DEGREES
            )
          : line

      return simplified.map((point) => [
        point.longitude,
        point.latitude,
      ])
    })
    .filter((line) => line.length >= 2)

  if (coordinates.length === 0) {
    return null
  }

  return {
    type: "Feature",
    geometry: {
      type: "MultiLineString",
      coordinates,
    },
    properties: {
      id: trailId,
      name: "",
      score: 0,
      reason: null,
      distance_miles: 0,
      elevation_gain_feet: 0,
      difficulty: "",
      location: null,
      park_name: null,
      county: null,
    },
  }
}
