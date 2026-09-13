import shapefile from "shapefile"
import booleanPointInPolygon from "@turf/boolean-point-in-polygon"
import { point } from "@turf/helpers"

import db from "../../db/database.js"

import {
  getTrailGeometry,
} from "../../repositories/trailGeometryRepository.js"

const SHAPEFILE_PATH =
  "data/state-parks/ParkBoundaries/ParkBoundaries.shp"

const MATCH_THRESHOLD = 0.70

interface ParkBoundary {
  name: string
  subtype: string
  unitNumber: string
  geometry: any
}

interface ParkMatch {
  boundary: ParkBoundary
  meters: number
}

async function loadParkBoundaries(): Promise<
  ParkBoundary[]
> {
  const source =
    await shapefile.open(
      SHAPEFILE_PATH,
      undefined,
      {
        encoding: "utf-8",
      }
    )

  const boundaries: ParkBoundary[] = []

  while (true) {
    const result =
      await source.read()

    if (result.done) {
      break
    }

    const feature = result.value

    if (!feature.properties) {
      continue
    }

    boundaries.push({
      name: String(
        feature.properties.UNITNAME ?? ""
      ),
      subtype: String(
        feature.properties.SUBTYPE ?? ""
      ),
      unitNumber: String(
        feature.properties.UNITNBR ?? ""
      ),
      geometry: feature.geometry,
    })
  }

  return boundaries
}

function lonLatToWebMercator(
  longitude: number,
  latitude: number
): [number, number] {
  const x =
    longitude * 20037508.34 / 180

  const clampedLatitude =
    Math.max(
      -85.05112878,
      Math.min(
        85.05112878,
        latitude
      )
    )

  const y =
    Math.log(
      Math.tan(
        (90 + clampedLatitude) *
          Math.PI /
          360
      )
    ) /
    (Math.PI / 180)

  return [
    x,
    y * 20037508.34 / 180,
  ]
}

function distanceMeters(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
): number {
  const earthRadius = 6371000

  const lat1 =
    latitude1 * Math.PI / 180

  const lat2 =
    latitude2 * Math.PI / 180

  const deltaLat =
    (latitude2 - latitude1) *
    Math.PI /
    180

  const deltaLon =
    (longitude2 - longitude1) *
    Math.PI /
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

  return earthRadius * c
}

function getParkMatches(
  trailId: number,
  boundaries: ParkBoundary[]
): ParkMatch[] {
  const geometry =
    getTrailGeometry(trailId)

  if (geometry.length < 2) {
    return []
  }

  const matches = new Map<
    ParkBoundary,
    number
  >()

  for (
    let index = 1;
    index < geometry.length;
    index++
  ) {
    const previous =
      geometry[index - 1]!

    const current =
      geometry[index]!

    const segmentLength =
      distanceMeters(
        previous.latitude,
        previous.longitude,
        current.latitude,
        current.longitude
      )

    if (segmentLength === 0) {
      continue
    }

    const [
      previousX,
      previousY,
    ] =
      lonLatToWebMercator(
        previous.longitude,
        previous.latitude
      )

    const [
      currentX,
      currentY,
    ] =
      lonLatToWebMercator(
        current.longitude,
        current.latitude
      )

    const midpoint =
      point([
        (previousX + currentX) / 2,
        (previousY + currentY) / 2,
      ])

    for (const boundary of boundaries) {
      if (
        booleanPointInPolygon(
          midpoint,
          boundary.geometry
        )
      ) {
        matches.set(
          boundary,
          (matches.get(boundary) ?? 0) +
            segmentLength
        )
      }
    }
  }

  return [...matches.entries()]
    .map(
      ([boundary, meters]) => ({
        boundary,
        meters,
      })
    )
    .sort(
      (a, b) =>
        b.meters - a.meters
    )
}

function getTotalTrailLength(
  trailId: number
): number {
  const geometry =
    getTrailGeometry(trailId)

  let total = 0

  for (
    let index = 1;
    index < geometry.length;
    index++
  ) {
    total +=
      distanceMeters(
        geometry[index - 1]!.latitude,
        geometry[index - 1]!.longitude,
        geometry[index]!.latitude,
        geometry[index]!.longitude
      )
  }

  return total
}

async function main() {
  console.log(
    "Loading California State Parks boundaries..."
  )

  const boundaries =
    await loadParkBoundaries()

  console.log(
    `Loaded ${boundaries.length} boundaries`
  )

  const trails = db.prepare(`
    SELECT
      id,
      name
    FROM trails
    WHERE source = 'openstreetmap'
    ORDER BY id
  `).all() as {
    id: number
    name: string
  }[]

  console.log(
    `Processing ${trails.length} OSM trails...`
  )

  let matched = 0
  let unmatched = 0

  const updateTrail =
    db.prepare(`
      UPDATE trails
      SET
        park_name = ?,
        park_type = ?,
        park_source = ?
      WHERE id = ?
    `)

  for (const trail of trails) {
    const totalMeters =
      getTotalTrailLength(
        trail.id
      )

    if (totalMeters === 0) {
      unmatched++
      continue
    }

    const matches =
      getParkMatches(
        trail.id,
        boundaries
      )

    const bestMatch =
      matches[0]

    if (
      !bestMatch ||
      bestMatch.meters /
        totalMeters <
        MATCH_THRESHOLD
    ) {
      unmatched++
      continue
    }

    updateTrail.run(
      bestMatch.boundary.name,
      bestMatch.boundary.subtype,
      "california_state_parks",
      trail.id
    )

    matched++

    const percentage =
      bestMatch.meters /
      totalMeters *
      100

    console.log(
      `${trail.name} → ` +
      `${bestMatch.boundary.name} ` +
      `(${percentage.toFixed(1)}%)`
    )
  }

  console.log("")
  console.log(
    "Park enrichment complete"
  )
  console.log(
    `  Matched: ${matched}`
  )
  console.log(
    `  Unmatched: ${unmatched}`
  )
  console.log(
    `  Total: ${trails.length}`
  )

  db.close()
}

main().catch((error) => {
  console.error(
    "Park enrichment failed:",
    error
  )

  process.exit(1)
})
