import {
  fetchBayAreaTrails,
  fetchBayAreaHikingRelations,
} from "./overpass.js"

import type {
  OsmHikingRelation,
} from "./overpass.js"

import {
  normalizeOsmWay,
} from "./normalize.js"

import {
  groupTrails,
} from "./groupTrails.js"

import {
  filterTrailGroups,
} from "./filterTrails.js"

import {
  normalizeTrailGroup,
} from "./normalizeGroup.js"

import {
  upsertTrail,
} from "../../repositories/trailRepository.js"

import {
  replaceTrailGeometry,
} from "../../repositories/trailGeometryRepository.js"

import {
  findCounty,
} from "../geo/countyLookup.js"

import {
  getTrailCenter,
} from "../../repositories/trailGeometryRepository.js"

function getGroupCenter(
  group: {
    ways: Array<{
      geometry?: Array<{
        lat: number
        lon: number
      }>
    }>
  }
): {
  latitude: number
  longitude: number
} | null {
  const points =
    group.ways.flatMap(
      (way) => way.geometry ?? []
    )

  if (points.length === 0) {
    return null
  }

  const totalLatitude =
    points.reduce(
      (sum, point) =>
        sum + point.lat,
      0
    )

  const totalLongitude =
    points.reduce(
      (sum, point) =>
        sum + point.lon,
      0
    )

  return {
    latitude:
      totalLatitude / points.length,
    longitude:
      totalLongitude / points.length,
  }
}

export async function importBayAreaTrails() {
  console.log("Fetching OSM ways...")

  const ways =
    await fetchBayAreaTrails()

  console.log(
    `Received ${ways.length} OSM ways`
  )

  let relations: OsmHikingRelation[] = []

  try {
    console.log("Fetching hiking relations...")

    relations =
      await fetchBayAreaHikingRelations()

    console.log(
      `Received ${relations.length} hiking relations`
    )
  } catch (error) {
    console.warn(
      "Warning: hiking relations could not be fetched."
    )

    console.warn(
      "Continuing import without relation metadata."
    )

    console.warn(
      error instanceof Error
        ? error.message
        : error
    )
  }

  const normalizedWays =
    ways
      .map(normalizeOsmWay)
      .filter(
        (
          trail
        ): trail is NonNullable<
          ReturnType<typeof normalizeOsmWay>
        > =>
          trail !== null
      )

  console.log(
    `Normalized ${normalizedWays.length} named ways`
  )

  const relationWayIds =
    new Map<number, number[]>()

  for (const relation of relations) {
    for (const member of
      relation.members ?? []) {
      if (
        member.type !== "way"
      ) {
        continue
      }

      const existing =
        relationWayIds.get(
          member.ref
        ) ?? []

      existing.push(
        relation.id
      )

      relationWayIds.set(
        member.ref,
        existing
      )
    }
  }

  const groups =
    groupTrails(
      ways,
      normalizedWays,
      relationWayIds
    )

  console.log(
    `Grouped into ${groups.length} candidate trails`
  )

  const candidates =
    filterTrailGroups(groups)

  console.log(
    `Importing ${candidates.length} trails`
  )

  let created = 0
  let updated = 0
  let osmDifficulty = 0

  for (const group of candidates) {
    console.log(
      `Importing trail ${created + updated + 1}/${candidates.length}: ${group.name}`
    )

    const trail =
      normalizeTrailGroup(group)

    const center =
      getGroupCenter(group)

    const county =
      center
        ? findCounty(
            center.latitude,
            center.longitude
          )
        : null

    if (
      trail.difficulty_source === "osm"
    ) {
      osmDifficulty++
    }

    const result =
      upsertTrail({
        name: trail.name,
        location: trail.location,
        description: trail.description,
        distance_miles:
          trail.distance_miles,
        estimated_time_minutes:
          trail.estimated_time_minutes,
        elevation_gain_feet:
          trail.elevation_gain_feet,
        difficulty:
          trail.difficulty,
        difficulty_source:
          trail.difficulty_source,
        terrain:
          trail.terrain,
        scenic_score:
          trail.scenic_score,
        nature_score:
          trail.nature_score,
        solitude_score:
          trail.solitude_score,
        water_score:
          trail.water_score,
        source:
          trail.source,
        source_id:
          trail.source_id,
        county:
          county,
      })

    let geometrySequence = 0

    const geometryPoints = group.ways.flatMap(
      (way) =>
        (way.geometry ?? []).map(
          (point) => ({
            way_id: way.id,
            sequence: geometrySequence++,
            latitude: point.lat,
            longitude: point.lon,
          })
        )
    )

    replaceTrailGeometry(
      result.trail.id,
      geometryPoints
    )

    if (result.created) {
      created++
    } else {
      updated++
    }
  }

  console.log("")
  console.log("Import complete")
  console.log(
    `  Created: ${created}`
  )
  console.log(
    `  Updated: ${updated}`
  )
  console.log(
    `  OSM difficulty: ${osmDifficulty}`
  )
  console.log(
    `  Total: ${candidates.length}`
  )
}
