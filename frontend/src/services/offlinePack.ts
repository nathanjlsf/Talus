export interface MapBounds {
  west: number
  south: number
  east: number
  north: number
}

export interface TileId {
  z: number
  x: number
  y: number
}

interface VectorSource {
  type?: string
  url?: string
  tiles?: string[]
  minzoom?: number
  maxzoom?: number
  tileSize?: number
}

export interface OfflineStyle {
  version: number
  sources: Record<string, VectorSource>
  sprite?: string
  glyphs?: string
  layers: unknown[]
  [key: string]: unknown
}

export interface OfflinePack {
  trailId: number
  style: OfflineStyle
  paths: number[][][]
  savedAt: string
  bytes: number
}

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty"
const PADDING_DEGREES = 0.012
const HIKE_ZOOMS = [14, 13, 12]
const TILE_CAP = 1500
const DB_NAME = "talus-offline"
const DB_VERSION = 1
const FONTS = [
  "Noto Sans Regular",
  "Noto Sans Italic",
  "Noto Sans Bold",
]
const GLYPH_RANGES = ["0-255", "256-511"]

let databasePromise: Promise<IDBDatabase> | null = null
let downloadGeneration = 0

function lonToTileX(longitude: number, zoom: number) {
  return ((longitude + 180) / 360) * 2 ** zoom
}

function latToTileY(latitude: number, zoom: number) {
  const radians = (latitude * Math.PI) / 180
  const mercator = Math.log(
    Math.tan(radians) + 1 / Math.cos(radians)
  )

  return ((1 - mercator / Math.PI) / 2) * 2 ** zoom
}

export function boundsForPaths(
  paths: number[][][],
  paddingDegrees = PADDING_DEGREES
): MapBounds | null {
  let west = Infinity
  let south = Infinity
  let east = -Infinity
  let north = -Infinity

  for (const path of paths) {
    for (const coordinate of path) {
      const longitude = coordinate[0]
      const latitude = coordinate[1]

      if (
        longitude === undefined ||
        latitude === undefined ||
        !Number.isFinite(longitude) ||
        !Number.isFinite(latitude)
      ) {
        continue
      }

      west = Math.min(west, longitude)
      east = Math.max(east, longitude)
      south = Math.min(south, latitude)
      north = Math.max(north, latitude)
    }
  }

  if (!Number.isFinite(west)) {
    return null
  }

  return {
    west: Math.max(-180, west - paddingDegrees),
    south: Math.max(-85, south - paddingDegrees),
    east: Math.min(180, east + paddingDegrees),
    north: Math.min(85, north + paddingDegrees),
  }
}

export function tilesCovering(
  bounds: MapBounds,
  zoom: number
): TileId[] {
  const limit = 2 ** zoom
  const xStart = Math.min(
    limit - 1,
    Math.max(0, Math.floor(lonToTileX(bounds.west, zoom)))
  )
  const xEnd = Math.min(
    limit - 1,
    Math.max(0, Math.floor(lonToTileX(bounds.east, zoom)))
  )
  const yStart = Math.min(
    limit - 1,
    Math.max(0, Math.floor(latToTileY(bounds.north, zoom)))
  )
  const yEnd = Math.min(
    limit - 1,
    Math.max(0, Math.floor(latToTileY(bounds.south, zoom)))
  )
  const tiles: TileId[] = []

  for (let x = xStart; x <= xEnd; x += 1) {
    for (let y = yStart; y <= yEnd; y += 1) {
      tiles.push({ z: zoom, x, y })
    }
  }

  return tiles
}

export function tilesForHike(bounds: MapBounds) {
  const tiles: TileId[] = []

  for (const zoom of HIKE_ZOOMS) {
    const next = tilesCovering(bounds, zoom)

    if (zoom < 14 && tiles.length + next.length > TILE_CAP) {
      continue
    }

    tiles.push(...next)
  }

  return tiles
}

export function tileUrl(template: string, tile: TileId) {
  return template
    .replace("{z}", String(tile.z))
    .replace("{x}", String(tile.x))
    .replace("{y}", String(tile.y))
}

export function toOfflineUrl(url: string) {
  if (url.startsWith("https://")) {
    return `talus://${url.slice("https://".length)}`
  }

  if (url.startsWith("http://")) {
    return `talus://${url.slice("http://".length)}`
  }

  return url
}

export function fromOfflineUrl(url: string) {
  const marker = "://"
  const index = url.indexOf(marker)

  if (index === -1) {
    return url
  }

  return `https://${url.slice(index + marker.length)}`
}

export function normalizeRemoteUrl(url: string) {
  const https = fromOfflineUrl(url)

  try {
    const parsed = new URL(https)
    parsed.hash = ""
    return parsed.toString()
  } catch {
    return https
  }
}

export function fileKey(trailId: number, url: string) {
  return `${trailId}|${normalizeRemoteUrl(url)}`
}

export function glyphUrls(template: string) {
  return FONTS.flatMap((font) =>
    GLYPH_RANGES.map((range) =>
      template
        .replace("{fontstack}", encodeURIComponent(font))
        .replace("{range}", range)
    )
  )
}

export function spriteUrls(sprite: string) {
  return [
    `${sprite}.json`,
    `${sprite}.png`,
    `${sprite}@2x.json`,
    `${sprite}@2x.png`,
  ]
}

export function rewriteStyle(
  style: OfflineStyle,
  tileTemplates: Record<string, string[]>
): OfflineStyle {
  const sources: OfflineStyle["sources"] = {}

  for (const [name, source] of Object.entries(style.sources)) {
    const templates = tileTemplates[name]

    if (source.type === "vector" && templates) {
      sources[name] = {
        type: "vector",
        tiles: templates.map(toOfflineUrl),
        minzoom: source.minzoom,
        maxzoom: source.maxzoom,
      }
      continue
    }

    sources[name] = source
  }

  return {
    ...style,
    sources,
    sprite: style.sprite
      ? toOfflineUrl(style.sprite)
      : style.sprite,
    glyphs: style.glyphs
      ? toOfflineUrl(style.glyphs)
      : style.glyphs,
  }
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result)
    }
    request.onerror = () => {
      reject(request.error)
    }
  })
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve()
    }
    transaction.onerror = () => {
      reject(transaction.error)
    }
    transaction.onabort = () => {
      reject(transaction.error)
    }
  })
}

function openDatabase() {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = () => {
        const database = request.result

        if (!database.objectStoreNames.contains("packs")) {
          database.createObjectStore("packs", {
            keyPath: "trailId",
          })
        }

        if (!database.objectStoreNames.contains("files")) {
          database.createObjectStore("files")
        }
      }
      request.onsuccess = () => {
        resolve(request.result)
      }
      request.onerror = () => {
        databasePromise = null
        reject(request.error)
      }
    })
  }

  return databasePromise
}

async function readPack(trailId: number) {
  const database = await openDatabase()

  return requestToPromise(
    database
      .transaction("packs")
      .objectStore("packs")
      .get(trailId)
  ) as Promise<OfflinePack | undefined>
}

export async function getOfflinePack(trailId: number) {
  const pack = await readPack(trailId)

  return pack ?? null
}

export async function readCachedFile(
  trailId: number,
  url: string
) {
  const database = await openDatabase()
  const stored = await requestToPromise(
    database
      .transaction("files")
      .objectStore("files")
      .get(fileKey(trailId, url))
  )

  return stored instanceof ArrayBuffer ? stored : null
}

async function writeFile(
  trailId: number,
  url: string,
  bytes: ArrayBuffer
) {
  const database = await openDatabase()
  const transaction = database.transaction("files", "readwrite")
  transaction
    .objectStore("files")
    .put(bytes, fileKey(trailId, url))
  await transactionDone(transaction)
}

async function deleteTrailFiles(trailId: number) {
  const database = await openDatabase()
  const keys = await requestToPromise(
    database.transaction("files").objectStore("files").getAllKeys()
  )
  const prefix = `${trailId}|`
  const transaction = database.transaction(
    ["files", "packs"],
    "readwrite"
  )

  for (const key of keys) {
    if (typeof key === "string" && key.startsWith(prefix)) {
      transaction.objectStore("files").delete(key)
    }
  }

  transaction.objectStore("packs").delete(trailId)
  await transactionDone(transaction)
}

export async function deleteOfflinePack(trailId: number) {
  await deleteTrailFiles(trailId)
}

async function fetchJson<T>(
  url: string,
  signal: AbortSignal
): Promise<T> {
  const response = await fetch(url, { signal })

  if (!response.ok) {
    throw new Error(
      "Couldn't save the map. Check your connection and try again."
    )
  }

  return response.json() as Promise<T>
}

async function fetchBytes(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(
      "Couldn't save the map. Check your connection and try again."
    )
  }

  return response.arrayBuffer()
}

async function pool<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
) {
  let next = 0

  async function run() {
    while (next < items.length) {
      const index = next
      next += 1
      const item = items[index]

      if (item !== undefined) {
        await worker(item)
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () =>
      run()
    )
  )
}

export async function downloadOfflinePack(input: {
  trailId: number
  paths: number[][][]
  signal?: AbortSignal
  onProgress?: (done: number, total: number) => void
}) {
  const signal = input.signal ?? new AbortController().signal
  const generation = ++downloadGeneration
  const bounds = boundsForPaths(input.paths)

  if (!bounds) {
    throw new Error("This trail has no route to download.")
  }

  const style = await fetchJson<OfflineStyle>(STYLE_URL, signal)
  const tileTemplates: Record<string, string[]> = {}
  const downloads: string[] = []

  for (const [name, source] of Object.entries(style.sources)) {
    if (source.type !== "vector" || !source.url) {
      continue
    }

    const tilejson = await fetchJson<{
      tiles?: string[]
      minzoom?: number
      maxzoom?: number
    }>(source.url, signal)
    const template = tilejson.tiles?.[0]

    if (!template) {
      throw new Error(
        "Couldn't save the map. Check your connection and try again."
      )
    }

    source.minzoom = tilejson.minzoom ?? source.minzoom
    source.maxzoom = tilejson.maxzoom ?? 14
    tileTemplates[name] = [template]

    for (const tile of tilesForHike(bounds)) {
      downloads.push(tileUrl(template, tile))
    }
  }

  if (style.glyphs) {
    downloads.push(...glyphUrls(style.glyphs))
  }

  if (style.sprite) {
    downloads.push(...spriteUrls(style.sprite))
  }

  await deleteTrailFiles(input.trailId)

  let done = 0
  let bytes = 0
  input.onProgress?.(0, downloads.length)

  try {
    await pool(downloads, 4, async (url) => {
      const payload = await fetchBytes(url, signal)

      if (payload) {
        bytes += payload.byteLength
        await writeFile(input.trailId, url, payload)
      }

      done += 1
      input.onProgress?.(done, downloads.length)
    })

    const database = await openDatabase()
    const transaction = database.transaction("packs", "readwrite")
    const pack: OfflinePack = {
      trailId: input.trailId,
      style: rewriteStyle(style, tileTemplates),
      paths: input.paths,
      savedAt: new Date().toISOString(),
      bytes,
    }
    transaction.objectStore("packs").put(pack)
    await transactionDone(transaction)
    return pack
  } catch (error) {
    if (generation === downloadGeneration) {
      await deleteTrailFiles(input.trailId).catch(() => undefined)
    }
    throw error
  }
}
