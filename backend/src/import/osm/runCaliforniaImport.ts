import db from "../../db/database.js"
import { importCaliforniaTrails } from "./importCalifornia.js"

async function main() {
  try {
    await importCaliforniaTrails()
  } catch (error) {
    console.error("California trail import failed:")
    console.error(error)
    process.exitCode = 1
  } finally {
    db.close()
  }
}

main()
