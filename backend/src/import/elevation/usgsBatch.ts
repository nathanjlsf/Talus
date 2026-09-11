import { getElevation } from "./usgs.js"

export interface ElevationRequestPoint {
  latitude: number
  longitude: number
}

export interface ElevationResult {
  latitude: number
  longitude: number
  elevation_feet: number
}

const CONCURRENCY = 5
const REQUEST_DELAY_MS = 500
const MAX_RETRIES = 3

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, milliseconds)
  )
}

async function getElevationWithRetry(
  point: ElevationRequestPoint
): Promise<number> {
  let lastError: unknown

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt++
  ) {
    try {
      return await getElevation(
        point.latitude,
        point.longitude
      )
    } catch (error) {
      lastError = error

      if (attempt < MAX_RETRIES) {
        const delay =
          REQUEST_DELAY_MS * attempt

        console.log(
          `  Elevation retry ${attempt}/${MAX_RETRIES - 1} ` +
          `for ${point.latitude},${point.longitude} ` +
          `after ${delay}ms`
        )

        await sleep(delay)
      }
    }
  }

  throw lastError
}

export async function getElevations(
  points: ElevationRequestPoint[]
): Promise<ElevationResult[]> {
  if (points.length === 0) {
    return []
  }

  const results: ElevationResult[] = []

  for (
    let index = 0;
    index < points.length;
    index += CONCURRENCY
  ) {
    const batch =
      points.slice(
        index,
        index + CONCURRENCY
      )

    const batchResults =
      await Promise.all(
        batch.map(
          async (point) => ({
            latitude: point.latitude,
            longitude: point.longitude,
            elevation_feet:
              await getElevationWithRetry(
                point
              ),
          })
        )
      )

    results.push(...batchResults)

    console.log(
      `  Elevation progress: ${results.length}/${points.length}`
    )

    if (
      index + CONCURRENCY <
      points.length
    ) {
      await sleep(
        REQUEST_DELAY_MS
      )
    }
  }

  return results
}
