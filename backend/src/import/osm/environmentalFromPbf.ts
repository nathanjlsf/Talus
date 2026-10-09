import fs from "node:fs"
import path from "node:path"

import Database from "better-sqlite3"

import { CELL_DEGREES } from "./hikingWays.js"
import { forEachPbfBatch } from "./pbfStream.js"

import type { EnvironmentalGeometry } from "./environmentalScoring.js"
import type { PbfItem } from "./pbfStream.js"

const PBF_PATH = path.resolve(
  process.cwd(),
  "data",
  "california-latest.osm.pbf"
)

const INDEX_PATH = path.resolve(
  process.cwd(),
  "data",
  "environmental-features.db"
)

const CELL_PADDING = 0.01
const WRITE_BATCH = 2000
const ID_SHARDS = 64

class IdSet {
  private shards: Array<Set<number>>
  size = 0

  constructor() {
    this.shards = Array.from(
      { length: ID_SHARDS },
      () => new Set<number>()
    )
  }

  add(id: number) {
    const shard =
      this.shards[id % ID_SHARDS]!
    const before = shard.size

    shard.add(id)

    if (shard.size !== before) {
      this.size += 1
    }
  }

  has(id: number): boolean {
    return this.shards[id % ID_SHARDS]!.has(id)
  }
}

interface Bounds {
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
}

interface WayRow {
  id: number
  tags: string | null
  refs: string
}

export function isEnvironmentalTags(
  tags: Record<string, string> | undefined
): boolean {
  if (!tags) {
    return false
  }

  if (
    tags.natural === "wood" ||
    tags.natural === "water" ||
    tags.natural === "beach" ||
    tags.natural === "coastline"
  ) {
    return true
  }

  if (tags.landuse === "forest") {
    return true
  }

  return typeof tags.waterway === "string"
}

export function cellsOverlappingBounds(
  bounds: Bounds
): string[] {
  const latitudeStart = Math.floor(
    (bounds.minLat - CELL_PADDING) / CELL_DEGREES
  )
  const latitudeEnd = Math.floor(
    (bounds.maxLat + CELL_PADDING) / CELL_DEGREES
  )
  const longitudeStart = Math.floor(
    (bounds.minLon - CELL_PADDING) / CELL_DEGREES
  )
  const longitudeEnd = Math.floor(
    (bounds.maxLon + CELL_PADDING) / CELL_DEGREES
  )

  const cells: string[] = []

  for (
    let latitudeIndex = latitudeStart;
    latitudeIndex <= latitudeEnd;
    latitudeIndex += 1
  ) {
    for (
      let longitudeIndex = longitudeStart;
      longitudeIndex <= longitudeEnd;
      longitudeIndex += 1
    ) {
      cells.push(
        `${latitudeIndex}:${longitudeIndex}`
      )
    }
  }

  return cells
}

function boundsForPoints(
  points: Array<{ lat: number; lon: number }>
): Bounds | null {
  if (points.length === 0) {
    return null
  }

  let minLat = points[0]!.lat
  let maxLat = points[0]!.lat
  let minLon = points[0]!.lon
  let maxLon = points[0]!.lon

  for (const point of points) {
    minLat = Math.min(minLat, point.lat)
    maxLat = Math.max(maxLat, point.lat)
    minLon = Math.min(minLon, point.lon)
    maxLon = Math.max(maxLon, point.lon)
  }

  return { minLat, maxLat, minLon, maxLon }
}

function openIndex(): Database.Database {
  fs.mkdirSync(path.dirname(INDEX_PATH), {
    recursive: true,
  })

  const index = new Database(INDEX_PATH)

  index.pragma("journal_mode = WAL")
  index.pragma("synchronous = NORMAL")

  index.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ways (
      id INTEGER PRIMARY KEY,
      tags TEXT,
      refs TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS relations (
      id INTEGER PRIMARY KEY,
      tags TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS relation_members (
      relation_id INTEGER NOT NULL,
      way_id INTEGER NOT NULL,
      role TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS nodes (
      id INTEGER PRIMARY KEY,
      lat REAL NOT NULL,
      lon REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS features (
      cell TEXT NOT NULL,
      feature_type TEXT NOT NULL,
      feature_id INTEGER NOT NULL,
      tags TEXT,
      geometry TEXT,
      members TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_features_cell
      ON features (cell);
  `)

  return index
}

function metaValue(
  index: Database.Database,
  key: string
): string | null {
  const row = index
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
  index: Database.Database,
  key: string,
  value: string
) {
  index
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

function pbfSignature(): string {
  const stat = fs.statSync(PBF_PATH)

  return `${stat.size}:${stat.mtimeMs}`
}

function resetIndex(index: Database.Database) {
  index.exec(`
    DELETE FROM meta;
    DELETE FROM ways;
    DELETE FROM relations;
    DELETE FROM relation_members;
    DELETE FROM nodes;
    DELETE FROM features;
  `)
}

function indexIsReady(
  index: Database.Database
): boolean {
  return (
    metaValue(index, "status") === "ready" &&
    metaValue(index, "pbf") === pbfSignature()
  )
}

function collectEnvironmentalObject(
  item: PbfItem,
  wayBuffer: Array<{
    id: number
    tags: string
    refs: string
  }>,
  relationBuffer: Array<{
    id: number
    tags: string
    members: Array<{
      wayId: number
      role: string
    }>
  }>
): "way" | "relation" | null {
  if (
    item.type === "way" &&
    isEnvironmentalTags(item.tags) &&
    item.refs &&
    item.refs.length >= 2
  ) {
    wayBuffer.push({
      id: item.id,
      tags: JSON.stringify(item.tags),
      refs: item.refs.join(","),
    })

    return "way"
  }

  if (
    item.type === "relation" &&
    isEnvironmentalTags(item.tags)
  ) {
    const members = (item.members ?? [])
      .filter((member) => member.type === "way")
      .map((member) => ({
        wayId: member.id,
        role: member.role,
      }))

    if (members.length === 0) {
      return null
    }

    relationBuffer.push({
      id: item.id,
      tags: JSON.stringify(item.tags),
      members,
    })

    return "relation"
  }

  return null
}

async function storeEnvironmentalObjects(
  index: Database.Database
) {
  const insertWay = index.prepare(`
    INSERT OR REPLACE INTO ways (id, tags, refs)
    VALUES (?, ?, ?)
  `)

  const insertRelation = index.prepare(`
    INSERT OR REPLACE INTO relations (id, tags)
    VALUES (?, ?)
  `)

  const insertMember = index.prepare(`
    INSERT INTO relation_members (
      relation_id,
      way_id,
      role
    )
    VALUES (?, ?, ?)
  `)

  const writeWays = index.transaction(
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

  const writeRelations = index.transaction(
    (
      relations: Array<{
        id: number
        tags: string
        members: Array<{
          wayId: number
          role: string
        }>
      }>
    ) => {
      for (const relation of relations) {
        insertRelation.run(
          relation.id,
          relation.tags
        )

        for (const member of relation.members) {
          insertMember.run(
            relation.id,
            member.wayId,
            member.role
          )
        }
      }
    }
  )

  let wayBuffer: Array<{
    id: number
    tags: string
    refs: string
  }> = []

  let relationBuffer: Array<{
    id: number
    tags: string
    members: Array<{
      wayId: number
      role: string
    }>
  }> = []

  let ways = 0
  let relations = 0
  let seen = 0

  function flush() {
    if (wayBuffer.length > 0) {
      writeWays(wayBuffer)
      wayBuffer = []
    }

    if (relationBuffer.length > 0) {
      writeRelations(relationBuffer)
      relationBuffer = []
    }
  }

  console.log(
    "Reading environmental features from the California extract..."
  )

  await forEachPbfBatch(
    PBF_PATH,
    async (items) => {
      for (const item of items) {
        seen += 1

        const collected =
          collectEnvironmentalObject(
            item,
            wayBuffer,
            relationBuffer
          )

        if (collected === "way") {
          ways += 1
        }

        if (collected === "relation") {
          relations += 1
        }

        if (seen % 2000000 === 0) {
          console.log(
            `Scanned ${seen} OSM objects...`
          )
        }
      }

      if (
        wayBuffer.length >= WRITE_BATCH ||
        relationBuffer.length >= WRITE_BATCH
      ) {
        flush()
      }
    }
  )

  flush()

  console.log(
    `Stored ${ways} environmental ways and ${relations} environmental relations`
  )
}

async function storeMissingMemberWays(
  index: Database.Database
) {
  const existing = new Set(
    (
      index
        .prepare(`SELECT id FROM ways`)
        .all() as Array<{ id: number }>
    ).map((row) => row.id)
  )

  const missing = new Set<number>()

  const members = index
    .prepare(
      `
      SELECT DISTINCT way_id
      FROM relation_members
      `
    )
    .all() as Array<{ way_id: number }>

  for (const member of members) {
    if (!existing.has(member.way_id)) {
      missing.add(member.way_id)
    }
  }

  if (missing.size === 0) {
    return
  }

  console.log(
    `Reading ${missing.size} relation member ways...`
  )

  const insertWay = index.prepare(`
    INSERT OR IGNORE INTO ways (id, tags, refs)
    VALUES (?, NULL, ?)
  `)

  const writeWays = index.transaction(
    (
      ways: Array<{
        id: number
        refs: string
      }>
    ) => {
      for (const way of ways) {
        insertWay.run(way.id, way.refs)
      }
    }
  )

  let buffer: Array<{
    id: number
    refs: string
  }> = []

  await forEachPbfBatch(
    PBF_PATH,
    async (items) => {
      for (const item of items) {
        if (
          item.type !== "way" ||
          !missing.has(item.id) ||
          !item.refs ||
          item.refs.length < 2
        ) {
          continue
        }

        buffer.push({
          id: item.id,
          refs: item.refs.join(","),
        })
      }

      if (buffer.length >= WRITE_BATCH) {
        writeWays(buffer)
        buffer = []
      }
    }
  )

  if (buffer.length > 0) {
    writeWays(buffer)
  }
}

function neededNodeIds(
  index: Database.Database
): IdSet {
  const needed = new IdSet()

  const rows = index
    .prepare(`SELECT refs FROM ways`)
    .iterate() as Iterable<Pick<WayRow, "refs">>

  for (const row of rows) {
    for (const part of row.refs.split(",")) {
      const id = Number(part)

      if (Number.isFinite(id)) {
        needed.add(id)
      }
    }
  }

  console.log(
    `Need coordinates for ${needed.size} environmental nodes`
  )

  return needed
}

async function storeNodes(
  index: Database.Database,
  needed: IdSet
) {
  const insertNode = index.prepare(`
    INSERT OR REPLACE INTO nodes (id, lat, lon)
    VALUES (?, ?, ?)
  `)

  const writeNodes = index.transaction(
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

  let seen = 0

  console.log(
    "Reading environmental node coordinates..."
  )

  await forEachPbfBatch(
    PBF_PATH,
    async (items) => {
      for (const item of items) {
        seen += 1

        if (seen % 2000000 === 0) {
          console.log(
            `Scanned ${seen} OSM objects for coordinates...`
          )
        }

        if (
          item.type !== "node" ||
          !needed.has(item.id) ||
          item.lat === undefined ||
          item.lon === undefined
        ) {
          continue
        }

        buffer.push({
          id: item.id,
          lat: item.lat,
          lon: item.lon,
        })
      }

      if (buffer.length >= WRITE_BATCH) {
        writeNodes(buffer)
        buffer = []
      }
    }
  )

  if (buffer.length > 0) {
    writeNodes(buffer)
  }
}

function coordinatesForRefs(
  refs: string,
  nodeById: (
    id: number
  ) => { lat: number; lon: number } | undefined
): Array<{ lat: number; lon: number }> {
  const points: Array<{
    lat: number
    lon: number
  }> = []

  for (const part of refs.split(",")) {
    const node = nodeById(Number(part))

    if (!node) {
      continue
    }

    points.push(node)
  }

  return points
}

function writeCellFeatures(
  index: Database.Database
) {
  const nodeStatement = index.prepare(`
    SELECT lat, lon
    FROM nodes
    WHERE id = ?
  `)

  const nodeById = (id: number) =>
    nodeStatement.get(id) as
      | { lat: number; lon: number }
      | undefined

  const insertFeature = index.prepare(`
    INSERT INTO features (
      cell,
      feature_type,
      feature_id,
      tags,
      geometry,
      members
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const writeFeatures = index.transaction(
    (
      rows: Array<{
        cell: string
        type: string
        id: number
        tags: string | null
        geometry: string | null
        members: string | null
      }>
    ) => {
      for (const row of rows) {
        insertFeature.run(
          row.cell,
          row.type,
          row.id,
          row.tags,
          row.geometry,
          row.members
        )
      }
    }
  )

  let buffer: Array<{
    cell: string
    type: string
    id: number
    tags: string | null
    geometry: string | null
    members: string | null
  }> = []

  function queueFeature(
    type: string,
    id: number,
    tags: string | null,
    geometry: Array<{
      lat: number
      lon: number
    }> | null,
    members: EnvironmentalGeometry["members"] | null
  ) {
    const points = [
      ...(geometry ?? []),
      ...(members ?? []).flatMap(
        (member) => member.geometry ?? []
      ),
    ]
    const bounds = boundsForPoints(points)

    if (!bounds) {
      return
    }

    for (const cell of cellsOverlappingBounds(
      bounds
    )) {
      buffer.push({
        cell,
        type,
        id,
        tags,
        geometry: geometry
          ? JSON.stringify(geometry)
          : null,
        members: members
          ? JSON.stringify(members)
          : null,
      })
    }

    if (buffer.length >= WRITE_BATCH) {
      const pending = buffer
      buffer = []
      writeFeatures(pending)
    }
  }

  const pageWays = index.prepare(`
    SELECT id, tags, refs
    FROM ways
    WHERE tags IS NOT NULL
      AND id > ?
    ORDER BY id
    LIMIT 200
  `)

  let lastWayId = 0

  while (true) {
    const ways = pageWays.all(lastWayId) as WayRow[]

    if (ways.length === 0) {
      break
    }

    for (const way of ways) {
      const geometry = coordinatesForRefs(
        way.refs,
        nodeById
      )

      if (geometry.length < 2) {
        continue
      }

      queueFeature(
        "way",
        way.id,
        way.tags,
        geometry,
        null
      )
    }

    lastWayId = ways[ways.length - 1]!.id
  }

  const relations = index
    .prepare(
      `
      SELECT id, tags
      FROM relations
      `
    )
    .all() as Array<{
      id: number
      tags: string
    }>

  const memberStatement = index.prepare(`
    SELECT
      relation_members.way_id,
      relation_members.role,
      ways.refs
    FROM relation_members
    LEFT JOIN ways
      ON ways.id = relation_members.way_id
    WHERE relation_members.relation_id = ?
  `)

  for (const relation of relations) {
    const members = memberStatement.all(
      relation.id
    ) as Array<{
      way_id: number
      role: string
      refs: string | null
    }>

    const geometryMembers = members.flatMap(
      (member) => {
        if (!member.refs) {
          return []
        }

        const geometry = coordinatesForRefs(
          member.refs,
          nodeById
        )

        if (geometry.length < 2) {
          return []
        }

        return [
          {
            type: "way",
            ref: member.way_id,
            role: member.role,
            geometry,
          },
        ]
      }
    )

    if (geometryMembers.length === 0) {
      continue
    }

    queueFeature(
      "relation",
      relation.id,
      relation.tags,
      null,
      geometryMembers
    )
  }

  if (buffer.length > 0) {
    writeFeatures(buffer)
  }
}

function rowCount(
  index: Database.Database,
  table: "ways" | "relations" | "nodes"
): number {
  const row = index
    .prepare(
      `SELECT COUNT(*) AS count FROM ${table}`
    )
    .get() as { count: number }

  return row.count
}

async function buildIndex(
  index: Database.Database
) {
  const signature = pbfSignature()
  const savedSignature = metaValue(index, "pbf")

  if (
    savedSignature &&
    savedSignature !== signature
  ) {
    resetIndex(index)
  }

  const hasWays =
    rowCount(index, "ways") > 0 &&
    rowCount(index, "relations") > 0
  const hasNodes = rowCount(index, "nodes") > 0
  const stage = metaValue(index, "stage")
  const nodesReady =
    hasWays &&
    (stage === "nodes" ||
      (stage === null && hasNodes))

  if (nodesReady) {
    console.log(
      "Resuming environmental index from saved coordinates"
    )
    index.exec(`DELETE FROM features`)
    setMeta(index, "pbf", signature)
    setMeta(index, "stage", "nodes")
  } else if (hasWays) {
    console.log(
      "Resuming environmental index from saved ways"
    )
    setMeta(index, "pbf", signature)
    await storeNodes(
      index,
      neededNodeIds(index)
    )
    setMeta(index, "stage", "nodes")
  } else {
    resetIndex(index)
    setMeta(index, "pbf", signature)
    await storeEnvironmentalObjects(index)
    await storeMissingMemberWays(index)
    await storeNodes(
      index,
      neededNodeIds(index)
    )
    setMeta(index, "stage", "nodes")
  }

  console.log(
    "Indexing environmental features by map cell..."
  )

  writeCellFeatures(index)

  index.exec(`
    DELETE FROM ways;
    DELETE FROM relations;
    DELETE FROM relation_members;
    DELETE FROM nodes;
  `)

  setMeta(index, "pbf", pbfSignature())
  setMeta(index, "status", "ready")

  console.log(
    "Environmental feature index is ready"
  )
}

export interface EnvironmentalFeatureIndex {
  featuresForCell(
    cell: string
  ): EnvironmentalGeometry[]
  close(): void
}

export async function openEnvironmentalFeatureIndex(): Promise<EnvironmentalFeatureIndex> {
  if (!fs.existsSync(PBF_PATH)) {
    throw new Error(
      `California extract not found at ${PBF_PATH}`
    )
  }

  const index = openIndex()

  if (!indexIsReady(index)) {
    await buildIndex(index)
  } else {
    console.log(
      "Using saved environmental features from the California extract"
    )
  }

  const statement = index.prepare(`
    SELECT
      feature_type,
      feature_id,
      tags,
      geometry,
      members
    FROM features
    WHERE cell = ?
  `)

  return {
    featuresForCell(cell: string) {
      const rows = statement.all(cell) as Array<{
        feature_type: string
        feature_id: number
        tags: string | null
        geometry: string | null
        members: string | null
      }>

      return rows.map((row) => ({
        type: row.feature_type,
        id: row.feature_id,
        tags: row.tags
          ? (JSON.parse(row.tags) as Record<
              string,
              string
            >)
          : undefined,
        geometry: row.geometry
          ? (JSON.parse(row.geometry) as Array<{
              lat: number
              lon: number
            }>)
          : undefined,
        members: row.members
          ? (JSON.parse(
              row.members
            ) as EnvironmentalGeometry["members"])
          : undefined,
      }))
    },

    close() {
      index.close()
    },
  }
}
