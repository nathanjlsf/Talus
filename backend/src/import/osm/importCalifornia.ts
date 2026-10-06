import { createWriteStream } from "node:fs"
import fs from "node:fs"
import path from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"

import Database from "better-sqlite3"

import { findCounty } from "../geo/countyLookup.js"
import { cleanupUnseenOsmTrails } from "./importTrails.js"
import {
  cellKey,
  isHikingRelation,
  isHikingWay,
  shouldCleanupStaleTrails,
} from "./hikingWays.js"
import { filterOverlappingGroups } from "./filterOverlappingGroups.js"
import { filterTrailGroups } from "./filterTrails.js"
import { groupTrails } from "./groupTrails.js"
import { normalizeOsmWay } from "./normalize.js"
import { normalizeTrailGroup } from "./normalizeGroup.js"
import { forEachPbfBatch } from "./pbfStream.js"
import { replaceTrailGeometry } from "../../repositories/trailGeometryRepository.js"
import { upsertOsmTrail } from "../../repositories/trailRepository.js"

import type { OsmWay } from "./overpass.js"

const EXTRACT_URL =
  "https://download.geofabrik.de/north-america/us/california-latest.osm.pbf"

const DATA_DIRECTORY = path.resolve(
  process.cwd(),
  "data"
)

const EXTRACT_PATH = path.join(
  DATA_DIRECTORY,
  "california-latest.osm.pbf"
)

const CACHE_PATH = path.join(
  DATA_DIRECTORY,
  "california-import.db"
)

const WRITE_BATCH = 2000
const NODE_QUERY_BATCH = 400

interface WayRow {
  id: number
  tags: string
  refs: string
}

function openCache(): Database.Database {
  fs.mkdirSync(DATA_DIRECTORY, { recursive: true })

  const cache = new Database(CACHE_PATH)

  cache.pragma("journal_mode = WAL")
  cache.pragma("synchronous = NORMAL")

  cache.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ways (
      id INTEGER PRIMARY KEY,
      tags TEXT NOT NULL,
      refs TEXT NOT NULL,
      cell TEXT
    );

    CREATE TABLE IF NOT EXISTS relation_members (
      way_id INTEGER NOT NULL,
      relation_id INTEGER NOT NULL,
      PRIMARY KEY (way_id, relation_id)
    );

    CREATE TABLE IF NOT EXISTS nodes (
      id INTEGER PRIMARY KEY,
      lat REAL NOT NULL,
      lon REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS completed_cells (
      cell TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS seen_source_ids (
      source_id TEXT PRIMARY KEY,
      cell TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ways_cell
      ON ways (cell);
  `)

  return cache
}

function metaValue(
  cache: Database.Database,
  key: string
): string | null {
  const row = cache
    .prepare(
      `
      SELECT value
      FROM meta
      WHERE key = ?
      `
    )
    .get(key) as { value: string } | undefined

  return row?.value ?? null
}

function setMeta(
  cache: Database.Database,
  key: string,
  value: string
) {
  cache
    .prepare(
      `
      INSERT INTO meta (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value
      `
    )
    .run(key, value)
}

async function downloadExtract() {
  fs.mkdirSync(DATA_DIRECTORY, { recursive: true })

  const sizePath = `${EXTRACT_PATH}.size`

  if (
    fs.existsSync(EXTRACT_PATH) &&
    fs.existsSync(sizePath)
  ) {
    const expected = Number(
      fs.readFileSync(sizePath, "utf8")
    )

    if (
      fs.statSync(EXTRACT_PATH).size === expected
    ) {
      console.log(
        "California extract already downloaded"
      )
      return
    }
  }

  console.log(
    `Downloading ${EXTRACT_URL}`
  )

  const response = await fetch(EXTRACT_URL, {
    headers: {
      "User-Agent":
        "Talus/1.0 (hiking trail importer)",
    },
  })

  if (!response.ok || !response.body) {
    throw new Error(
      `California extract download failed: ${response.status}`
    )
  }

  const partial = `${EXTRACT_PATH}.partial`

  await pipeline(
    Readable.fromWeb(
      response.body as unknown as import("node:stream/web").ReadableStream
    ),
    createWriteStream(partial)
  )

  const size = fs.statSync(partial).size
  fs.renameSync(partial, EXTRACT_PATH)
  fs.writeFileSync(sizePath, String(size))

  console.log(
    `Saved California extract (${size} bytes)`
  )
}

async function readWays(
  cache: Database.Database
) {
  console.log("Reading hiking ways...")

  const insertWay = cache.prepare(`
    INSERT OR REPLACE INTO ways (id, tags, refs, cell)
    VALUES (?, ?, ?, NULL)
  `)

  const insertMember = cache.prepare(`
    INSERT OR IGNORE INTO relation_members (
      way_id,
      relation_id
    )
    VALUES (?, ?)
  `)

  const writeWays = cache.transaction(
    (
      ways: Array<{
        id: number
        tags: string
        refs: string
      }>
    ) => {
      for (const way of ways) {
        insertWay.run(
          way.id,
          way.tags,
          way.refs
        )
      }
    }
  )

  const writeMembers = cache.transaction(
    (
      members: Array<{
        wayId: number
        relationId: number
      }>
    ) => {
      for (const member of members) {
        insertMember.run(
          member.wayId,
          member.relationId
        )
      }
    }
  )

  let wayBuffer: Array<{
    id: number
    tags: string
    refs: string
  }> = []

  let memberBuffer: Array<{
    wayId: number
    relationId: number
  }> = []

  let ways = 0
  let relations = 0

  function flush() {
    if (wayBuffer.length > 0) {
      writeWays(wayBuffer)
      wayBuffer = []
    }

    if (memberBuffer.length > 0) {
      writeMembers(memberBuffer)
      memberBuffer = []
    }
  }

  await forEachPbfBatch(
    EXTRACT_PATH,
    async (items) => {
      for (const item of items) {
        if (
          item.type === "way" &&
          isHikingWay(item.tags) &&
          item.refs &&
          item.refs.length >= 2
        ) {
          wayBuffer.push({
            id: item.id,
            tags: JSON.stringify(item.tags),
            refs: item.refs.join(","),
          })
          ways += 1
        }

        if (
          item.type === "relation" &&
          isHikingRelation(item.tags)
        ) {
          relations += 1

          for (const member of item.members ?? []) {
            if (member.type !== "way") {
              continue
            }

            memberBuffer.push({
              wayId: member.id,
              relationId: item.id,
            })
          }
        }
      }

      if (
        wayBuffer.length >= WRITE_BATCH ||
        memberBuffer.length >= WRITE_BATCH
      ) {
        flush()
      }
    }
  )

  flush()

  console.log(
    `Stored ${ways} named hiking ways and ${relations} hiking relations`
  )
}

function neededNodeIds(
  cache: Database.Database
): Set<number> {
  const needed = new Set<number>()

  const rows = cache
    .prepare(`SELECT refs FROM ways`)
    .iterate() as Iterable<{ refs: string }>

  for (const row of rows) {
    for (const part of row.refs.split(",")) {
      const id = Number(part)

      if (Number.isFinite(id)) {
        needed.add(id)
      }
    }
  }

  console.log(
    `Need coordinates for ${needed.size} nodes`
  )

  return needed
}

async function readNodes(
  cache: Database.Database,
  needed: Set<number>
) {
  console.log("Reading node coordinates...")

  const insertNode = cache.prepare(`
    INSERT OR REPLACE INTO nodes (id, lat, lon)
    VALUES (?, ?, ?)
  `)

  const writeNodes = cache.transaction(
    (
      nodes: Array<{
        id: number
        lat: number
        lon: number
      }>
    ) => {
      for (const node of nodes) {
        insertNode.run(
          node.id,
          node.lat,
          node.lon
        )
      }
    }
  )

  let buffer: Array<{
    id: number
    lat: number
    lon: number
  }> = []

  let stored = 0
  let scanned = 0

  await forEachPbfBatch(
    EXTRACT_PATH,
    async (items) => {
      for (const item of items) {
        scanned += 1

        if (
          item.type !== "node" ||
          item.lat === undefined ||
          item.lon === undefined ||
          !needed.has(item.id)
        ) {
          continue
        }

        buffer.push({
          id: item.id,
          lat: item.lat,
          lon: item.lon,
        })
        stored += 1
      }

      if (buffer.length >= WRITE_BATCH) {
        writeNodes(buffer)
        buffer = []
      }

      if (scanned % 2_000_000 === 0) {
        console.log(
          `  Scanned ${scanned} OSM objects, stored ${stored} nodes`
        )
      }
    }
  )

  if (buffer.length > 0) {
    writeNodes(buffer)
  }

  console.log(`Stored ${stored} node coordinates`)
}

function assignCells(cache: Database.Database) {
  console.log("Assigning ways to map cells...")

  const lookup = cache.prepare(`
    SELECT lat, lon
    FROM nodes
    WHERE id = ?
  `)

  const update = cache.prepare(`
    UPDATE ways
    SET cell = ?
    WHERE id = ?
  `)

  const ways = cache
    .prepare(`SELECT id, refs FROM ways`)
    .iterate() as Iterable<{
      id: number
      refs: string
    }>

  const assignments: Array<{
    id: number
    cell: string
  }> = []

  for (const way of ways) {
    const firstRef = Number(way.refs.split(",")[0])
    const node = lookup.get(firstRef) as
      | { lat: number; lon: number }
      | undefined

    assignments.push({
      id: way.id,
      cell: node
        ? cellKey(node.lat, node.lon)
        : "missing",
    })
  }

  const assignBatch = cache.transaction(
    (
      batch: Array<{
        id: number
        cell: string
      }>
    ) => {
      for (const way of batch) {
        update.run(way.cell, way.id)
      }
    }
  )

  for (
    let index = 0;
    index < assignments.length;
    index += WRITE_BATCH
  ) {
    assignBatch(
      assignments.slice(index, index + WRITE_BATCH)
    )
  }
}

function geometryForWay(
  way: WayRow,
  coordinates: Map<
    number,
    { lat: number; lon: number }
  >
): OsmWay | null {
  const tags = JSON.parse(way.tags) as Record<
    string,
    string
  >

  const geometry = way.refs
    .split(",")
    .map((part) => coordinates.get(Number(part)))
    .filter(
      (
        point
      ): point is { lat: number; lon: number } =>
        point !== undefined
    )

  if (geometry.length < 2) {
    return null
  }

  return {
    type: "way",
    id: way.id,
    tags,
    geometry,
  }
}

function coordinatesForWays(
  cache: Database.Database,
  ways: WayRow[]
): Map<number, { lat: number; lon: number }> {
  const ids = new Set<number>()

  for (const way of ways) {
    for (const part of way.refs.split(",")) {
      ids.add(Number(part))
    }
  }

  const coordinates = new Map<
    number,
    { lat: number; lon: number }
  >()

  const idList = [...ids]
  const lookup = (batch: number[]) => {
    const placeholders = batch
      .map(() => "?")
      .join(", ")

    const rows = cache
      .prepare(
        `
        SELECT id, lat, lon
        FROM nodes
        WHERE id IN (${placeholders})
        `
      )
      .all(...batch) as Array<{
        id: number
        lat: number
        lon: number
      }>

    for (const row of rows) {
      coordinates.set(row.id, {
        lat: row.lat,
        lon: row.lon,
      })
    }
  }

  for (
    let index = 0;
    index < idList.length;
    index += NODE_QUERY_BATCH
  ) {
    lookup(
      idList.slice(
        index,
        index + NODE_QUERY_BATCH
      )
    )
  }

  return coordinates
}

function relationMapForWays(
  cache: Database.Database,
  wayIds: number[]
): Map<number, number[]> {
  const relationWayIds = new Map<
    number,
    number[]
  >()

  for (
    let index = 0;
    index < wayIds.length;
    index += NODE_QUERY_BATCH
  ) {
    const batch = wayIds.slice(
      index,
      index + NODE_QUERY_BATCH
    )

    const placeholders = batch
      .map(() => "?")
      .join(", ")

    const rows = cache
      .prepare(
        `
        SELECT way_id, relation_id
        FROM relation_members
        WHERE way_id IN (${placeholders})
        `
      )
      .all(...batch) as Array<{
        way_id: number
        relation_id: number
      }>

    for (const row of rows) {
      const existing =
        relationWayIds.get(row.way_id) ?? []

      existing.push(row.relation_id)
      relationWayIds.set(row.way_id, existing)
    }
  }

  return relationWayIds
}

function importCell(
  cache: Database.Database,
  cell: string
) {
  const ways = cache
    .prepare(
      `
      SELECT id, tags, refs
      FROM ways
      WHERE cell = ?
      `
    )
    .all(cell) as WayRow[]

  const coordinates = coordinatesForWays(
    cache,
    ways
  )

  const osmWays = ways
    .map((way) =>
      geometryForWay(way, coordinates)
    )
    .filter(
      (way): way is OsmWay => way !== null
    )

  const normalizedWays = osmWays.flatMap((way) => {
    const normalized = normalizeOsmWay(way)
    return normalized ? [normalized] : []
  })

  const relationWayIds = relationMapForWays(
    cache,
    osmWays.map((way) => way.id)
  )

  const groups = filterOverlappingGroups(
    filterTrailGroups(
      groupTrails(
        osmWays,
        normalizedWays,
        relationWayIds
      )
    )
  )

  const rememberSourceId = cache.prepare(`
    INSERT OR REPLACE INTO seen_source_ids (
      source_id,
      cell
    )
    VALUES (?, ?)
  `)

  cache
    .prepare(
      `
      DELETE FROM seen_source_ids
      WHERE cell = ?
      `
    )
    .run(cell)

  let created = 0
  let updated = 0

  for (const group of groups) {
    const trail = normalizeTrailGroup(group)
    const center = groupCenter(group)

    const result = upsertOsmTrail({
      name: trail.name,
      location: trail.location,
      description: trail.description,
      distance_miles: trail.distance_miles,
      estimated_time_minutes:
        trail.estimated_time_minutes,
      elevation_gain_feet:
        trail.elevation_gain_feet,
      difficulty: trail.difficulty,
      difficulty_source:
        trail.difficulty_source,
      terrain: trail.terrain,
      scenic_score: trail.scenic_score,
      nature_score: trail.nature_score,
      solitude_score: trail.solitude_score,
      water_score: trail.water_score,
      source: trail.source,
      source_id: trail.source_id,
      county: center
        ? findCounty(
            center.latitude,
            center.longitude
          )
        : null,
    })

    replaceTrailGeometry(
      result.trail.id,
      group.ways.flatMap((way) =>
        (way.geometry ?? []).map(
          (point, sequence) => ({
            way_id: way.id,
            sequence,
            latitude: point.lat,
            longitude: point.lon,
          })
        )
      )
    )

    rememberSourceId.run(
      trail.source_id,
      cell
    )

    if (result.created) {
      created += 1
    } else {
      updated += 1
    }
  }

  cache
    .prepare(
      `
      INSERT OR IGNORE INTO completed_cells (cell)
      VALUES (?)
      `
    )
    .run(cell)

  console.log(
    `Cell ${cell}: created ${created}, updated ${updated}, kept ${groups.length}`
  )
}

function groupCenter(group: {
  ways: Array<{
    geometry?: Array<{
      lat: number
      lon: number
    }>
  }>
}): {
  latitude: number
  longitude: number
} | null {
  const points = group.ways.flatMap(
    (way) => way.geometry ?? []
  )

  if (points.length === 0) {
    return null
  }

  const latitude =
    points.reduce(
      (sum, point) => sum + point.lat,
      0
    ) / points.length

  const longitude =
    points.reduce(
      (sum, point) => sum + point.lon,
      0
    ) / points.length

  return { latitude, longitude }
}

function finishImport(cache: Database.Database) {
  const total = cache
    .prepare(
      `
      SELECT COUNT(DISTINCT cell) AS count
      FROM ways
      WHERE cell != 'missing'
      `
    )
    .get() as { count: number }

  const completed = cache
    .prepare(
      `
      SELECT COUNT(*) AS count
      FROM completed_cells
      WHERE cell IN (
        SELECT DISTINCT cell
        FROM ways
        WHERE cell != 'missing'
      )
      `
    )
    .get() as { count: number }

  if (
    !shouldCleanupStaleTrails(
      total.count,
      completed.count
    )
  ) {
    console.log(
      `Import paused at ${completed.count}/${total.count} cells. Run the import again to resume.`
    )
    return
  }

  const seen = new Set<string>()

  const rows = cache
    .prepare(
      `
      SELECT source_id
      FROM seen_source_ids
      `
    )
    .iterate() as Iterable<{
      source_id: string
    }>

  for (const row of rows) {
    seen.add(row.source_id)
  }

  const removed = cleanupUnseenOsmTrails(seen)

  setMeta(cache, "cleanup", "complete")

  console.log(
    `Statewide import complete. Removed ${removed} stale OSM trails.`
  )
}

export async function importCaliforniaTrails() {
  await downloadExtract()

  const cache = openCache()

  try {
    if (metaValue(cache, "ways") !== "complete") {
      cache.exec(`
        DELETE FROM ways;
        DELETE FROM relation_members;
        DELETE FROM nodes;
        DELETE FROM completed_cells;
        DELETE FROM seen_source_ids;
      `)

      await readWays(cache)
      setMeta(cache, "ways", "complete")
      setMeta(cache, "nodes", "pending")
      setMeta(cache, "cells", "pending")
    }

    if (metaValue(cache, "nodes") !== "complete") {
      cache.exec(`DELETE FROM nodes`)
      const needed = neededNodeIds(cache)
      await readNodes(cache, needed)
      setMeta(cache, "nodes", "complete")
      setMeta(cache, "cells", "pending")
    }

    if (metaValue(cache, "cells") !== "complete") {
      assignCells(cache)
      setMeta(cache, "cells", "complete")
    }

    const cells = cache
      .prepare(
        `
        SELECT DISTINCT cell
        FROM ways
        WHERE cell != 'missing'
        ORDER BY cell
        `
      )
      .all() as Array<{ cell: string }>

    const done = new Set(
      (
        cache
          .prepare(
            `
            SELECT cell
            FROM completed_cells
            `
          )
          .all() as Array<{ cell: string }>
      ).map((row) => row.cell)
    )

    for (const row of cells) {
      if (done.has(row.cell)) {
        continue
      }

      importCell(cache, row.cell)
    }

    finishImport(cache)
  } finally {
    cache.close()
  }
}
