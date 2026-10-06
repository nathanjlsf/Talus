import fs from "node:fs"

import shapefile from "shapefile"
import booleanPointInPolygon from "@turf/boolean-point-in-polygon"
import { point } from "@turf/helpers"

import db from "../../db/database.js"

import {
  getTrailGeometryLines,
} from "../../repositories/trailGeometryRepository.js"

import { isDirectRun } from "../directRun.js"

const SHAPEFILE_PATH =
  "data/location/CaliforniaPlaces/tl_2025_06_place.shp"

const MATCH_THRESHOLD = 0.50

interface PlaceBoundary {
  name: string
  geometry: any
}

interface TrailPoint {
  latitude: number
  longitude: number
}

async function loadPlaceBoundaries(): Promise<PlaceBoundary[]> {
  if (!fs.existsSync(SHAPEFILE_PATH)) {
    throw new Error(
      `Places shapefile not found: ${SHAPEFILE_PATH}`
    )
  }

  const source =
    await shapefile.open(
      SHAPEFILE_PATH
    )

  const boundaries: PlaceBoundary[] = []

  while (true) {
    const result =
      await source.read()

    if (result.done) {
      break
    }

    const name =
      result.value?.properties?.NAME

    const geometry =
      result.value?.geometry

    if (
      typeof name !== "string" ||
      !name.trim() ||
      !geometry
    ) {
      continue
    }

    boundaries.push({
      name: name.trim(),
      geometry,
    })
  }

  return boundaries
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

function lineLength(
  line: TrailPoint[]
): number {
  let total = 0

  for (
    let index = 1;
    index < line.length;
    index++
  ) {
    total +=
      distanceMeters(
        line[index - 1]!.latitude,
        line[index - 1]!.longitude,
        line[index]!.latitude,
        line[index]!.longitude
      )
  }

  return total
}

function getTrailPlace(
  lines: TrailPoint[][],
  boundaries: PlaceBoundary[]
): {
  name: string
  percentage: number
} | null {
  const totalMeters = lines.reduce(
    (total, line) => total + lineLength(line),
    0
  )

  if (totalMeters === 0) {
    return null
  }

  const matches =
    new Map<string, number>()

  for (const line of lines) {
    for (
      let index = 1;
      index < line.length;
      index++
    ) {
      const previous =
        line[index - 1]!

      const current =
        line[index]!

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

    const midpoint =
      point([
        (
          previous.longitude +
          current.longitude
        ) / 2,
        (
          previous.latitude +
          current.latitude
        ) / 2,
      ])

    for (const boundary of boundaries) {
      if (
        booleanPointInPolygon(
          midpoint,
          boundary.geometry
        )
      ) {
        matches.set(
          boundary.name,
          (
            matches.get(
              boundary.name
            ) ?? 0
          ) + segmentLength
        )
      }
    }
    }
  }

  const best =
    [...matches.entries()]
      .sort(
        (a, b) =>
          b[1] - a[1]
      )[0]

  if (!best) {
    return null
  }

  const percentage =
    best[1] / totalMeters

  if (
    percentage <
    MATCH_THRESHOLD
  ) {
    return null
  }

  return {
    name: best[0],
    percentage,
  }
}

async function enrichLocations() {
  console.log(
    "Loading California place boundaries..."
  )

  const boundaries =
    await loadPlaceBoundaries()

  console.log(
    `Loaded ${boundaries.length} place boundaries`
  )

  const trails =
    db.prepare(`
      SELECT
        id,
        name
      FROM trails
      WHERE source = 'openstreetmap'
        AND location IS NULL
      ORDER BY id
    `).all() as {
      id: number
      name: string
    }[]

  console.log(
    `Processing ${trails.length} OSM trails without location...`
  )

  const updateTrail =
    db.prepare(`
      UPDATE trails
      SET location = ?
      WHERE id = ?
    `)

  let matched = 0
  let unmatched = 0

  for (const trail of trails) {
    const lines =
      getTrailGeometryLines(trail.id)
        .filter((line) => line.length >= 2)

    if (lines.length === 0) {
      unmatched++
      continue
    }

    const match =
      getTrailPlace(
        lines,
        boundaries
      )

    if (!match) {
      unmatched++
      continue
    }

    updateTrail.run(
      match.name,
      trail.id
    )

    matched++

    console.log(
      `${trail.name} → ` +
      `${match.name} ` +
      `(${(
        match.percentage * 100
      ).toFixed(1)}%)`
    )
  }

  console.log("")
  console.log(
    "Location enrichment complete"
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
}

export { enrichLocations }

if (isDirectRun(import.meta.url)) {
  enrichLocations()
    .catch((error) => {
      console.error(
        "Location enrichment failed:",
        error
      )

      process.exit(1)
    })
    .finally(() => {
      db.close()
    })
}
