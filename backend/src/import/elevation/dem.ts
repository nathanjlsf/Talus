import { fromFile } from "geotiff"

const DEM_DIRECTORY = "data/dem"

const METERS_TO_FEET = 3.28084

const DEM_TILES = new Set([
  "n37w123",
  "n37w122",
  "n38w123",
  "n38w122",
  "n39w123",
  "n39w122",
  "n39w124",
])

const imageCache =
  new Map<string, Promise<any>>()

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
  const latitudeTile =
    Math.ceil(latitude)

  const longitudeTile =
    Math.ceil(Math.abs(longitude))

  const tile =
    `n${latitudeTile}w${longitudeTile}`

  if (!DEM_TILES.has(tile)) {
    throw new Error(
      `No DEM tile available for ` +
      `${latitude}, ${longitude}`
    )
  }

  return tile
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
