import Database from "better-sqlite3"
import fs from "node:fs"
import path from "node:path"

const dataDirectory = path.resolve(process.cwd(), "data")

if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true })
}

const databasePath = path.join(dataDirectory, "talus.db")

const db: Database.Database = new Database(databasePath)

db.pragma("foreign_keys = ON")
db.pragma("journal_mode = WAL")

const schemaPath = path.resolve(
    process.cwd(),
    "src",
    "db",
    "schema.sql"
)
const schema = fs.readFileSync(schemaPath, "utf-8")

db.exec(schema)

export default db
