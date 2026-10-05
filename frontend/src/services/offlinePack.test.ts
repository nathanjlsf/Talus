import assert from "node:assert/strict"
import test from "node:test"

import {
  boundsForPaths,
  glyphUrls,
  rewriteStyle,
  tilesCovering,
  tilesForHike,
  toOfflineUrl,
  type OfflineStyle,
} from "./offlinePack.ts"

test("covers the trail with hike zoom tiles and skips the ocean", () => {
  const bounds = boundsForPaths(
    [
      [
        [-122.5, 37.75],
        [-122.48, 37.77],
      ],
    ],
    0
  )

  assert.ok(bounds)
  const tiles = tilesCovering(bounds, 14)
  const center = tilesCovering(
    {
      west: -122.49,
      south: 37.76,
      east: -122.49,
      north: 37.76,
    },
    14
  )

  assert.ok(center[0])
  assert.ok(
    tiles.some(
      (tile) =>
        tile.z === center[0]?.z &&
        tile.x === center[0]?.x &&
        tile.y === center[0]?.y
    )
  )
  assert.ok(tilesForHike(bounds).length > tiles.length)
})

test("rewrites vector tiles, sprites, and glyphs onto the offline protocol", () => {
  const style: OfflineStyle = {
    version: 8,
    sprite: "https://tiles.example/sprites/ofm",
    glyphs: "https://tiles.example/fonts/{fontstack}/{range}.pbf",
    sources: {
      openmaptiles: {
        type: "vector",
        url: "https://tiles.example/planet",
        minzoom: 0,
        maxzoom: 14,
      },
      hillshade: {
        type: "raster",
        tiles: ["https://tiles.example/shade/{z}/{x}/{y}.png"],
      },
    },
    layers: [],
  }

  const rewritten = rewriteStyle(style, {
    openmaptiles: [
      "https://tiles.example/planet/2026/{z}/{x}/{y}.pbf",
    ],
  })

  assert.deepEqual(rewritten.sources.openmaptiles?.tiles, [
    "talus://tiles.example/planet/2026/{z}/{x}/{y}.pbf",
  ])
  assert.equal(rewritten.sources.openmaptiles?.maxzoom, 14)
  assert.equal(
    rewritten.sources.hillshade?.tiles?.[0],
    "https://tiles.example/shade/{z}/{x}/{y}.png"
  )
  assert.equal(
    rewritten.sprite,
    "talus://tiles.example/sprites/ofm"
  )
  assert.equal(
    rewritten.glyphs,
    "talus://tiles.example/fonts/{fontstack}/{range}.pbf"
  )
  assert.equal(
    toOfflineUrl("https://tiles.example/a.png"),
    "talus://tiles.example/a.png"
  )
  assert.ok(
    glyphUrls(
      "https://tiles.example/fonts/{fontstack}/{range}.pbf"
    ).includes(
      "https://tiles.example/fonts/Noto%20Sans%20Regular/0-255.pbf"
    )
  )
})
