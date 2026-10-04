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
  getAllTrails,
  upsertTrail,
} from "../../repositories/trailRepository.js"

import {
  replaceTrailGeometry,
} from "../../repositories/trailGeometryRepository.js"

import {
  findCounty,
} from "../geo/countyLookup.js"

import {
  filterOverlappingGroups,
} from "./filterOverlappingGroups.js"

import db from "../../db/database.js"

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

function cleanupStaleOsmTrails(
  staleTrails: Array<{
    id: number
  }>
): number {
  const protectedTrailIds = new Set<number>()

  const activityTrails = db
    .prepare(
      `
      SELECT DISTINCT trail_id
      FROM activities
      `
    )
    .all() as Array<{
      trail_id: number
    }>

  for (const row of activityTrails) {
    protectedTrailIds.add(row.trail_id)
  }

  const comparisonTrails = db
    .prepare(
      `
      SELECT winner_trail_id AS trail_id
      FROM preference_comparisons

      UNION

      SELECT loser_trail_id AS trail_id
      FROM preference_comparisons
      `
    )
    .all() as Array<{
      trail_id: number
    }>

  for (const row of comparisonTrails) {
    protectedTrailIds.add(row.trail_id)
  }

  const trailsToDelete =
    staleTrails.filter(
      (trail) =>
        !protectedTrailIds.has(trail.id)
    )

  const deleteGeometry =
    db.prepare(
      `
      DELETE FROM trail_geometry
      WHERE trail_id = ?
      `
    )

  const deleteTrail =
    db.prepare(
      `
      DELETE FROM trails
      WHERE id = ?
        AND source = 'openstreetmap'
      `
    )

  const cleanup =
    db.transaction(() => {
      for (const trail of trailsToDelete) {
        deleteGeometry.run(trail.id)
        deleteTrail.run(trail.id)
      }
    })

  cleanup()

  console.log(
    `Removed ${trailsToDelete.length} stale OSM trails`
  )

  console.log(
    `Preserved ${staleTrails.length - trailsToDelete.length} stale OSM trails with user data`
  )

  return trailsToDelete.length
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

  const filteredGroups = filterTrailGroups(groups)

  const candidates =
    filterOverlappingGroups(filteredGroups)

  console.log(
    `After overlap filtering: ${candidates.length} trails`
  )

  console.log(
    `Overlap filter removed ${
      filteredGroups.length - candidates.length
    } groups`
  )

  console.log(
    `Importing ${candidates.length} trails`
  )

  const existingOsmTrails =
    getAllTrails().filter(
      (trail) =>
        trail.source === "openstreetmap" &&
        trail.source_id !== null &&
        trail.source_id !== undefined
    )

  const currentGroups = candidates.map(
    (group) =>
      new Set(
        group.ways.map((way) =>
          String(way.id)
        )
      )
  )

  const staleTrails =
    existingOsmTrails.filter((trail) => {
      const sourceIds =
        trail.source_id!
          .split(",")
          .map((sourceId) =>
            sourceId.trim()
          )

      const sourceIdSet =
        new Set(sourceIds)

      const isExactCurrentGroup =
        currentGroups.some(
          (groupSourceIds) =>
            groupSourceIds.size ===
              sourceIdSet.size &&
            [...sourceIdSet].every(
              (sourceId) =>
                groupSourceIds.has(
                  sourceId
                )
            )
        )

      return !isExactCurrentGroup
    })

  console.log(
    `Existing OSM trails: ${existingOsmTrails.length}`
  )

  console.log(
    `Stale OSM trails: ${staleTrails.length}`
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

    const geometryPoints = group.ways.flatMap(
      (way) =>
        (way.geometry ?? []).map(
          (point, sequence) => ({
            way_id: way.id,
            sequence,
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

  cleanupStaleOsmTrails(staleTrails)

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
