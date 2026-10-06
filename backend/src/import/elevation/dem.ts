import fs from "node:fs"
import path from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"

import { fromFile } from "geotiff"

const DEM_DIRECTORY = path.resolve(
  process.cwd(),
  "data",
  "dem"
)

const METERS_TO_FEET = 3.28084

const imageCache = new Map<string, Promise<any>>()

const unavailableTiles = new Set<string>()

export class DemTileUnavailableError extends Error {
  constructor(tile: string) {
    super(`DEM tile unavailable: ${tile}`)
    this.name = "DemTileUnavailableError"
  }
}

export function tileNameForCoordinate(
  latitude: number,
  longitude: number
): string {
  const latitudeTile = Math.ceil(latitude)
  const longitudeTile = Math.ceil(
    Math.abs(longitude)
  )

  return `n${latitudeTile}w${longitudeTile}`
}

async function ensureDemTile(
  tile: string
): Promise<void> {
  if (unavailableTiles.has(tile)) {
    throw new DemTileUnavailableError(tile)
  }

  const filename = `USGS_13_${tile}.tif`
  const destination = path.join(
    DEM_DIRECTORY,
    filename
  )

  if (
    fs.existsSync(destination) &&
    fs.statSync(destination).size > 0
  ) {
    return
  }

  fs.mkdirSync(DEM_DIRECTORY, { recursive: true })

  const url =
    "https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/13/TIFF/current/" +
    `${tile}/${filename}`

  const partial = `${destination}.partial`

  console.log(`Downloading DEM tile ${filename}`)

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Talus/1.0 (hiking trail importer)",
    },
  })

  if (!response.ok || !response.body) {
    unavailableTiles.add(tile)
    throw new DemTileUnavailableError(tile)
  }

  await pipeline(
    Readable.fromWeb(
      response.body as unknown as import("node:stream/web").ReadableStream
    ),
    fs.createWriteStream(partial)
  )

  fs.renameSync(partial, destination)
}

async function loadImage(
  tile: string
) {
  const tiff = await fromFile(
    `${DEM_DIRECTORY}/USGS_13_${tile}.tif`
  )

  return tiff.getImage()
}

async function getImage(
  tile: string
) {
  let imagePromise =
    imageCache.get(tile)

  if (!imagePromise) {
    imagePromise = loadImage(tile)
    imageCache.set(tile, imagePromise)
  }

  return imagePromise
}

function getTileForCoordinate(
  latitude: number,
  longitude: number
): string {
  return tileNameForCoordinate(
    latitude,
    longitude
  )
}

export async function getElevationFromDem(
  latitude: number,
  longitude: number
): Promise<number> {
  const tile =
    getTileForCoordinate(
      latitude,
      longitude
    )

  await ensureDemTile(tile)

  const image =
    await getImage(tile)

  const bbox =
    image.getBoundingBox()

  const minLon = bbox[0]!
  const minLat = bbox[1]!
  const maxLon = bbox[2]!
  const maxLat = bbox[3]!

  if (
    longitude < minLon ||
    longitude > maxLon ||
    latitude < minLat ||
    latitude > maxLat
  ) {
    throw new Error(
      `Coordinate outside DEM bounds: ` +
      `${latitude}, ${longitude}`
    )
  }

  const width =
    image.getWidth()

  const height =
    image.getHeight()

  const x =
    Math.floor(
      ((longitude - minLon) /
        (maxLon - minLon)) *
        width
    )

  const y =
    Math.floor(
      ((maxLat - latitude) /
        (maxLat - minLat)) *
        height
    )

  const rasters =
    await image.readRasters({
      window: [
        x,
        y,
        x + 1,
        y + 1,
      ],
    })

  const elevationMeters =
    Number(rasters[0]![0])

  if (
    !Number.isFinite(
      elevationMeters
    )
  ) {
    throw new Error(
      `Invalid DEM elevation at ` +
      `${latitude}, ${longitude}`
    )
  }

  return (
    elevationMeters *
    METERS_TO_FEET
  )
}
