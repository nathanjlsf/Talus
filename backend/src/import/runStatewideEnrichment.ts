import fs from "node:fs"

import db from "../db/database.js"

import { findCounty } from "./geo/countyLookup.js"
import { enrichTrails } from "./elevation/enrichTrails.js"
import { enrichLocations } from "./location/enrichLocation.js"
import { backfillEstimatedDifficulty } from "./osm/applyEstimatedDifficulty.js"
import { enrichEnvironmentalRegions } from "./osm/enrichEnvironmentalRegions.js"
import { enrichParkMetadata } from "./stateParks/enrichParkMetadata.js"
import { getTrailCenter } from "../repositories/trailGeometryRepository.js"

const PARK_SHAPEFILE =
  "data/state-parks/ParkBoundaries/ParkBoundaries.shp"

const PLACE_SHAPEFILE =
  "data/location/CaliforniaPlaces/tl_2025_06_place.shp"

function backfillCounties(): number {
  const trails = db
    .prepare(
      `
      SELECT id
      FROM trails
      WHERE source = 'openstreetmap'
        AND county IS NULL
      `
    )
    .all() as Array<{ id: number }>

  const update = db.prepare(`
    UPDATE trails
    SET county = ?
    WHERE id = ?
  `)

  let updated = 0

  for (const trail of trails) {
    const center = getTrailCenter(trail.id)

    if (!center) {
      continue
    }

    const county = findCounty(
      center.latitude,
      center.longitude
    )

    if (!county) {
      continue
    }

    update.run(county, trail.id)
    updated += 1
  }

  console.log(
    `County backfill updated ${updated} trails`
  )

  return updated
}

async function main() {
  const elevationLimit = Number(process.argv[2])
  const cellLimit = Number(process.argv[3])

  const includePlaces =
    process.argv.includes("--places")

  backfillCounties()

  if (!includePlaces) {
    console.log(
      "Skipping park and location enrichment. Pass --places to run them."
    )
  } else if (fs.existsSync(PARK_SHAPEFILE)) {
    await enrichParkMetadata()
  } else {
    console.log(
      `Skipping park enrichment. Shapefile not found at ${PARK_SHAPEFILE}`
    )
  }

  if (
    includePlaces &&
    fs.existsSync(PLACE_SHAPEFILE)
  ) {
    await enrichLocations()
  } else if (includePlaces) {
    console.log(
      `Skipping location enrichment. Shapefile not found at ${PLACE_SHAPEFILE}`
    )
  }

  const environmentalCells =
    Number.isInteger(cellLimit) && cellLimit > 0
      ? cellLimit
      : 1

  await enrichEnvironmentalRegions(
    environmentalCells
  )

  await enrichTrails(
    Number.isInteger(elevationLimit) &&
      elevationLimit > 0
      ? elevationLimit
      : 3
  )

  const estimated = backfillEstimatedDifficulty()

  console.log(
    `Difficulty backfill updated ${estimated} trails`
  )
}

main()
  .catch((error) => {
    console.error("Statewide enrichment failed:")
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => {
    db.close()
  })
