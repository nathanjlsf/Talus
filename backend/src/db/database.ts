import Database from "better-sqlite3"

import fs from "node:fs"
import path from "node:path"

const dataDirectory = path.resolve(process.cwd(), "data")

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true })
}

const databasePath = path.join(
  dataDirectory,
  "talus.db"
)

const db: Database.Database = new Database(
  databasePath
)

db.pragma("foreign_keys = ON")
db.pragma("journal_mode = WAL")

const schemaPath = path.resolve(
  process.cwd(),
  "src",
  "db",
  "schema.sql"
)

const schema = fs.readFileSync(
  schemaPath,
  "utf-8"
)

db.exec(schema)

function addColumnIfMissing(
  tableName: string,
  columnName: string,
  definition: string
) {
  const columns = db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all() as Array<{
      name: string
    }>

  const exists = columns.some(
    (column) => column.name === columnName
  )

  if (!exists) {
    db.exec(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`
    )
  }
}

addColumnIfMissing(
  "trails",
  "estimated_time_minutes",
  "INTEGER"
)

addColumnIfMissing(
  "trails",
  "terrain",
  "TEXT"
)

addColumnIfMissing(
  "trails",
  "nature_score",
  "REAL"
)

addColumnIfMissing(
  "trails",
  "water_score",
  "REAL"
)

addColumnIfMissing(
  "trails",
  "source",
  "TEXT"
)

addColumnIfMissing(
  "trails",
  "source_id",
  "TEXT"
)

addColumnIfMissing(
  "trails",
  "elevation_status",
  "TEXT NOT NULL DEFAULT 'pending'"
)

addColumnIfMissing(
  "trails",
  "elevation_attempts",
  "INTEGER NOT NULL DEFAULT 0"
)

addColumnIfMissing(
  "trails",
  "elevation_error",
  "TEXT"
)

const trailUpdates = [
  {
    name: "Lands End Trail",
    estimated_time_minutes: 90,
    terrain: "Dirt",
    nature_score: 0.7,
    water_score: 1.0,
  },
  {
    name: "Tennessee Valley Trail",
    estimated_time_minutes: 90,
    terrain: "Dirt",
    nature_score: 0.75,
    water_score: 1.0,
  },
  {
    name: "Mount Tamalpais",
    estimated_time_minutes: 240,
    terrain: "Mixed",
    nature_score: 0.9,
    water_score: 0.6,
  },
  {
    name: "Muir Woods",
    estimated_time_minutes: 75,
    terrain: "Paved",
    nature_score: 1.0,
    water_score: 0.1,
  },
  {
    name: "Dipsea Trail",
    estimated_time_minutes: 270,
    terrain: "Mixed",
    nature_score: 0.95,
    water_score: 0.7,
  },
  {
    name: "Cataract Falls",
    estimated_time_minutes: 240,
    terrain: "Rocky",
    nature_score: 0.95,
    water_score: 0.9,
  },
]

const updateTrail = db.prepare(`
  UPDATE trails
  SET
    estimated_time_minutes = ?,
    terrain = ?,
    nature_score = ?,
    water_score = ?
  WHERE name = ?
`)

for (const trail of trailUpdates) {
  updateTrail.run(
    trail.estimated_time_minutes,
    trail.terrain,
    trail.nature_score,
    trail.water_score,
    trail.name
  )
}

export default db
