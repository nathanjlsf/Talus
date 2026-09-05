import db from "./database.js"

const existingUser = db
  .prepare(
    `
    SELECT id
    FROM users
    LIMIT 1
    `
  )
  .get() as { id: number } | undefined

if (existingUser) {
  console.log(`User already exists with ID ${existingUser.id}`)
  process.exit(0)
}

const result = db
  .prepare(
    `
    INSERT INTO users (name)
    VALUES (?)
    `
  )
  .run("Nathan")

console.log(
  `Created demo user with ID ${Number(result.lastInsertRowid)}`
)