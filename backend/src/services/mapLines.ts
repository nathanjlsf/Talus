import db from "../db/database.js"

import { simplifyPath } from "../geo/trailLines.js"

const MAP_POINT_LIMIT = 100
const MAP_TOLERANCE_DEGREES = 0.0003
const MAP_LINE_VERSION = 2
const BATCH_SIZE = 200

interface GeometryPoint {
  trail_id: number
  way_id: number
  latitude: number
  longitude: number
}

export function ensureMapLineTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS trail_map_lines (
      trail_id INTEGER PRIMARY KEY,
      coordinates TEXT NOT NULL,
      FOREIGN KEY (trail_id) REFERENCES trails(id) ON DELETE CASCADE
    )
  `)
}

function limitPoints<T>(points: T[], limit: number): T[] {
  if (points.length <= limit) {
    return points
  }

  const kept: T[] = []
  const last = limit - 1

  for (let index = 0; index < limit; index += 1) {
    const sourceIndex = Math.round(
      (index * (points.length - 1)) / last
    )
    kept.push(points[sourceIndex]!)
  }

  return kept
}

function coordinatesFor(
  points: GeometryPoint[]
): number[][][] {
  const lines: GeometryPoint[][] = []

  for (const point of points) {
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

  const simplified = lines
    .map((line) =>
      simplifyPath(line, MAP_TOLERANCE_DEGREES).map(
        (point) => [point.longitude, point.latitude]
      )
    )
    .filter((line) => line.length >= 2)

  const total = simplified.reduce(
    (count, line) => count + line.length,
    0
  )

  if (total <= MAP_POINT_LIMIT) {
    return simplified
  }

  const ratio = MAP_POINT_LIMIT / total

  return simplified
    .map((line) =>
      limitPoints(
        line,
        Math.max(2, Math.round(line.length * ratio))
      )
    )
    .filter((line) => line.length >= 2)
}

function mapLineVersion(): number {
  db.exec(`
    CREATE TABLE IF NOT EXISTS trail_map_meta (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL
    )
  `)

  const row = db
    .prepare(
      "SELECT version FROM trail_map_meta WHERE id = 1"
    )
    .get() as { version: number } | undefined

  return row?.version ?? 0
}

function storeMapLineVersion() {
  db.prepare(`
    INSERT INTO trail_map_meta (id, version)
    VALUES (1, ?)
    ON CONFLICT(id) DO UPDATE SET version = excluded.version
  `).run(MAP_LINE_VERSION)
}

export function rebuildMissingMapLines(): number {
  ensureMapLineTable()

  if (mapLineVersion() !== MAP_LINE_VERSION) {
    db.exec("DELETE FROM trail_map_lines")
  }

  const missing = db
    .prepare(`
      SELECT trail_bounds.trail_id AS id
      FROM trail_bounds
      LEFT JOIN trail_map_lines
        ON trail_map_lines.trail_id = trail_bounds.trail_id
      WHERE trail_map_lines.trail_id IS NULL
      ORDER BY trail_bounds.trail_id
    `)
    .all() as Array<{ id: number }>

  const insert = db.prepare(`
    INSERT INTO trail_map_lines (trail_id, coordinates)
    VALUES (?, ?)
  `)

  let built = 0

  const writeBatch = db.transaction((ids: number[]) => {
    const placeholders = ids.map(() => "?").join(", ")
    const points = db
      .prepare(`
        SELECT trail_id, way_id, latitude, longitude
        FROM trail_geometry
        WHERE trail_id IN (${placeholders})
        ORDER BY trail_id, way_id, sequence
      `)
      .all(...ids) as GeometryPoint[]

    const byTrail = new Map<number, GeometryPoint[]>()

    for (const point of points) {
      const line = byTrail.get(point.trail_id) ?? []
      line.push(point)
      byTrail.set(point.trail_id, line)
    }

    for (const id of ids) {
      insert.run(
        id,
        JSON.stringify(coordinatesFor(byTrail.get(id) ?? []))
      )
      built += 1
    }
  })

  for (let index = 0; index < missing.length; index += BATCH_SIZE) {
    writeBatch(
      missing
        .slice(index, index + BATCH_SIZE)
        .map((row) => row.id)
    )
  }

  if (mapLineVersion() !== MAP_LINE_VERSION) {
    storeMapLineVersion()
  }

  return built
}

export function loadMapLines(
  trailIds: number[]
): Map<number, number[][][]> {
  ensureMapLineTable()

  if (trailIds.length === 0) {
    return new Map()
  }

  const placeholders = trailIds.map(() => "?").join(", ")
  const rows = db
    .prepare(`
      SELECT trail_id, coordinates
      FROM trail_map_lines
      WHERE trail_id IN (${placeholders})
    `)
    .all(...trailIds) as Array<{
      trail_id: number
      coordinates: string
    }>

  const lines = new Map<number, number[][][]>()

  for (const row of rows) {
    lines.set(
      row.trail_id,
      JSON.parse(row.coordinates) as number[][][]
    )
  }

  return lines
}

const entry = process.argv[1]?.replaceAll("\\", "/")

if (
  entry?.endsWith("src/services/mapLines.ts") ||
  entry?.endsWith("dist/services/mapLines.js")
) {
  console.time("build")
  console.log("built", rebuildMissingMapLines())
  console.timeEnd("build")
}
