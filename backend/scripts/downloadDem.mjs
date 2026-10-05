import fs from "node:fs"
import path from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"

const tiles = [
  "n37w123",
  "n37w122",
  "n38w123",
  "n38w122",
  "n39w123",
  "n39w122",
  "n39w124",
]

const directory = path.resolve("data/dem")

fs.mkdirSync(directory, { recursive: true })

for (const tile of tiles) {
  const filename = `USGS_13_${tile}.tif`
  const destination = path.join(directory, filename)

  if (
    fs.existsSync(destination) &&
    fs.statSync(destination).size > 0
  ) {
    console.log(`DEM tile ${filename} already present`)
    continue
  }

  const url =
    "https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/13/TIFF/current/" +
    `${tile}/${filename}`
  const partial = `${destination}.partial`

  console.log(`Downloading ${filename}`)

  const response = await fetch(url)

  if (!response.ok || !response.body) {
    throw new Error(
      `DEM download failed for ${tile}: ${response.status}`
    )
  }

  await pipeline(
    Readable.fromWeb(response.body),
    fs.createWriteStream(partial)
  )

  fs.renameSync(partial, destination)
  console.log(`Saved ${filename}`)
}
