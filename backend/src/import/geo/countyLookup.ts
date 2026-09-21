import fs from "node:fs"
import path from "node:path"

import proj4 from "proj4"

import {
  booleanPointInPolygon,
} from "@turf/boolean-point-in-polygon"

import {
  point,
} from "@turf/helpers"

import type {
  FeatureCollection,
  MultiPolygon,
  Polygon,
} from "geojson"

interface CountyProperties {
  CDT_NAME_SHORT?: string
}

type CountyCollection =
  FeatureCollection<
    Polygon | MultiPolygon,
    CountyProperties
  >

const COUNTY_FILE =
  path.resolve(
    process.cwd(),
    "data/california-counties.geojson"
  )

const counties =
  JSON.parse(
    fs.readFileSync(
      COUNTY_FILE,
      "utf-8"
    )
  ) as CountyCollection

const CALIFORNIA_TEAL_ALBERS =
  "+proj=aea +lat_1=34 +lat_2=40.5 +lat_0=0 +lon_0=-120 +x_0=0 +y_0=-4000000 +datum=NAD83 +units=m +no_defs"

const WGS84 =
  "EPSG:4326"

function convertCoordinates(
  coordinates: number[]
): [number, number] {
  const result =
    proj4(
      CALIFORNIA_TEAL_ALBERS,
      WGS84,
      coordinates
    )

  if (
    result.length < 2 ||
    result[0] === undefined ||
    result[1] === undefined
  ) {
    throw new Error(
      "Failed to transform county coordinates"
    )
  }

  return [
    result[0],
    result[1],
  ]
}

function transformPolygon(
  coordinates: number[][][]
): number[][][] {
  return coordinates.map(
    (ring) =>
      ring.map(
        (coordinate) =>
          convertCoordinates(
            coordinate
          )
      )
  )
}

function transformMultiPolygon(
  coordinates: number[][][][]
): number[][][][] {
  return coordinates.map(
    (polygon) =>
      transformPolygon(polygon)
  )
}

export function findCounty(
  latitude: number,
  longitude: number
): string | null {
  const trailPoint =
    point([
      longitude,
      latitude,
    ])

  for (const county of counties.features) {
    let geometry =
      county.geometry

    if (geometry.type === "Polygon") {
      geometry = {
        type: "Polygon",
        coordinates:
          transformPolygon(
            geometry.coordinates
          ),
      }
    } else {
      geometry = {
        type: "MultiPolygon",
        coordinates:
          transformMultiPolygon(
            geometry.coordinates
          ),
      }
    }

    const transformedCounty = {
      ...county,
      geometry,
    }

    if (
      booleanPointInPolygon(
        trailPoint,
        transformedCounty
      )
    ) {
      return (
        county.properties
          ?.CDT_NAME_SHORT ?? null
      )
    }
  }

  return null
}
