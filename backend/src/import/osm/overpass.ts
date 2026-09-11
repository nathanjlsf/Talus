const OVERPASS_URL =
  "https://overpass-api.de/api/interpreter"

const BAY_AREA_BBOX = {
  south: 37.0,
  west: -123.0,
  north: 38.9,
  east: -121.3,
}

const BBOX_GRID = [
  {
    south: 37.0,
    west: -123.0,
    north: 37.5,
    east: -122.15,
  },
  {
    south: 37.0,
    west: -122.15,
    north: 37.5,
    east: -121.3,
  },
  {
    south: 37.5,
    west: -123.0,
    north: 38.0,
    east: -122.15,
  },
  {
    south: 37.5,
    west: -122.15,
    north: 38.0,
    east: -121.3,
  },
  {
    south: 38.0,
    west: -123.0,
    north: 38.5,
    east: -122.15,
  },
  {
    south: 38.0,
    west: -122.15,
    north: 38.5,
    east: -121.3,
  },
  {
    south: 38.5,
    west: -123.0,
    north: 38.9,
    east: -122.15,
  },
  {
    south: 38.5,
    west: -122.15,
    north: 38.9,
    east: -121.3,
  },
]

const REQUEST_DELAY_MS = 5000
const MAX_RETRIES = 5

export interface OsmWay {
  type: "way"
  id: number
  tags?: Record<string, string>
  geometry?: Array<{
    lat: number
    lon: number
  }>
}

interface OverpassWaysResponse {
  elements: OsmWay[]
}

function sleep(
  milliseconds: number
): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(
      resolve,
      milliseconds
    )
  )
}

async function fetchWaysForBbox(
  bbox: {
    south: number
    west: number
    north: number
    east: number
  }
): Promise<OsmWay[]> {
  const {
    south,
    west,
    north,
    east,
  } = bbox

  const query = `
    [out:json][timeout:180];

    (
      way["highway"="path"](${south},${west},${north},${east});
      way["highway"="footway"](${south},${west},${north},${east});
      way["highway"="bridleway"](${south},${west},${north},${east});
      way["highway"="track"]["foot"="yes"](${south},${west},${north},${east});
      way["highway"="track"]["foot"="designated"](${south},${west},${north},${east});
    );

    out geom;
  `

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt++
  ) {
    try {
      const response = await fetch(
        OVERPASS_URL,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
            "User-Agent":
              "Talus/1.0 (hiking trail data importer)",
            "Referer":
              "http://localhost:5173/",
          },
          body:
            "data=" +
            encodeURIComponent(query),
        }
      )

      if (response.ok) {
        const data =
          (await response.json()) as OverpassWaysResponse

        return data.elements
      }

      if (
        response.status === 429 ||
        response.status === 504 ||
        response.status === 502 ||
        response.status === 503
      ) {
        if (attempt === MAX_RETRIES) {
          throw new Error(
            `Overpass request failed after ${MAX_RETRIES} attempts: ${response.status} ${response.statusText}`
          )
        }

        const retryDelay =
          REQUEST_DELAY_MS *
          2 ** (attempt - 1)

        console.warn(
          `Overpass returned ${response.status}. Retrying in ${retryDelay / 1000}s...`
        )

        await sleep(
          retryDelay
        )

        continue
      }

      throw new Error(
        `Overpass request failed: ${response.status} ${response.statusText}`
      )
    } catch (error) {
      if (
        attempt === MAX_RETRIES
      ) {
        throw error
      }

      const retryDelay =
        REQUEST_DELAY_MS *
        2 ** (attempt - 1)

      console.warn(
        `Overpass request error. Retrying in ${retryDelay / 1000}s...`
      )

      await sleep(
        retryDelay
      )
    }
  }

  throw new Error(
    "Overpass request failed unexpectedly"
  )
}

export async function fetchBayAreaTrails(): Promise<OsmWay[]> {
  const allWays =
    new Map<number, OsmWay>()

  for (
    let index = 0;
    index < BBOX_GRID.length;
    index++
  ) {
    const bbox =
      BBOX_GRID[index]!

    console.log(
      `Fetching trail ways for region ${index + 1}/${BBOX_GRID.length}...`
    )

    const ways =
      await fetchWaysForBbox(bbox)

    console.log(
      `  Received ${ways.length} ways`
    )

    for (const way of ways) {
      allWays.set(
        way.id,
        way
      )
    }

    if (
      index <
      BBOX_GRID.length - 1
    ) {
      console.log(
        `Waiting ${REQUEST_DELAY_MS / 1000}s before next region...`
      )

      await sleep(
        REQUEST_DELAY_MS
      )
    }
  }

  return Array.from(
    allWays.values()
  )
}

export interface OsmHikingRelation {
  type: "relation"
  id: number
  tags?: Record<string, string>
  members?: Array<{
    type: string
    ref: number
    role: string
  }>
}

interface OverpassRelationsResponse {
  elements: OsmHikingRelation[]
}

export async function fetchBayAreaHikingRelations(): Promise<
  OsmHikingRelation[]
> {
  const {
    south,
    west,
    north,
    east,
  } = BAY_AREA_BBOX

  const query = `
    [out:json][timeout:180];

    relation
      ["type"="route"]
      ["route"="hiking"]
      (${south},${west},${north},${east});

    out body;
  `

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt++
  ) {
    try {
      const response = await fetch(
        OVERPASS_URL,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
            "User-Agent":
              "Talus/1.0 (hiking trail data importer)",
            "Referer":
              "http://localhost:5173/",
          },
          body:
            "data=" +
            encodeURIComponent(query),
        }
      )

      if (response.ok) {
        const data =
          (await response.json()) as OverpassRelationsResponse

        return data.elements
      }

      if (
        response.status === 429 ||
        response.status === 504 ||
        response.status === 502 ||
        response.status === 503
      ) {
        if (
          attempt === MAX_RETRIES
        ) {
          throw new Error(
            `Overpass hiking relation request failed after ${MAX_RETRIES} attempts: ${response.status} ${response.statusText}`
          )
        }

        const retryDelay =
          REQUEST_DELAY_MS *
          2 ** (attempt - 1)

        console.warn(
          `Overpass relations returned ${response.status}. Retrying in ${retryDelay / 1000}s...`
        )

        await sleep(
          retryDelay
        )

        continue
      }

      throw new Error(
        `Overpass hiking relation request failed: ${response.status} ${response.statusText}`
      )
    } catch (error) {
      if (
        attempt === MAX_RETRIES
      ) {
        throw error
      }

      const retryDelay =
        REQUEST_DELAY_MS *
        2 ** (attempt - 1)

      console.warn(
        `Overpass relation request error. Retrying in ${retryDelay / 1000}s...`
      )

      await sleep(
        retryDelay
      )
    }
  }

  throw new Error(
    "Overpass hiking relation request failed unexpectedly"
  )
}
