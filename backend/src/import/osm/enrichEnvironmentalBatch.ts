import {
  readFile,
} from "node:fs/promises"

import Database from "better-sqlite3"

interface EnvironmentalResult {
  trailId: number
  name: string
  nearbyFeatures: number
  measurements: {
    nearestForestMeters: number | null
    nearestWaterMeters: number | null
    nearestCoastalMeters: number | null
    forestFeaturesWithin500m: number
    waterFeaturesWithin100m: number
    waterFeaturesWithin500m: number
  }
  scores: {
    forest: number
    water: number
    coastal: number
  }
}

async function main() {
  const db =
    new Database("data/talus.db")

  const results =
    JSON.parse(
      await readFile(
        "data/bay-area-environmental-results.json",
        "utf8"
      )
    ) as EnvironmentalResult[]

  console.log(
    `Environmental results: ${results.length}`
  )

  const update =
    db.prepare(`
      UPDATE trails
      SET
        forest_score = ?,
        water_score = ?,
        coastal_score = ?
      WHERE id = ?
    `)

  const updateAll =
    db.transaction(
      (
        rows: EnvironmentalResult[]
      ) => {
        for (const row of rows) {
          update.run(
            row.scores.forest,
            row.scores.water,
            row.scores.coastal,
            row.trailId
          )
        }
      }
    )

  updateAll(results)

  const updated =
    db.prepare(`
      SELECT COUNT(*) AS count
      FROM trails
      WHERE source = 'openstreetmap'
        AND forest_score IS NOT NULL
        AND water_score IS NOT NULL
        AND coastal_score IS NOT NULL
    `).get() as {
      count: number
    }

  console.log("")
  console.log(
    "Environmental enrichment complete"
  )
  console.log(
    `OSM trails with environmental scores: ${updated.count}`
  )

  db.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
