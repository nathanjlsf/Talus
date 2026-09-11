import {
  importBayAreaTrails,
} from "./importTrails.js"

import db from "../../db/database.js"

async function main() {
  try {
    await importBayAreaTrails()
  } catch (error) {
    console.error(
      "OSM trail import failed:"
    )

    console.error(error)

    process.exitCode = 1
  } finally {
    db.close()
  }
}

main()
