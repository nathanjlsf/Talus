import {
  getCachedElevations,
  saveElevations,
} from "../../repositories/elevationCacheRepository.js"

import {
  getElevations,
  type ElevationRequestPoint,
} from "./usgsBatch.js"

export async function getCachedOrFetchElevations(
  points: ElevationRequestPoint[]
) {
  if (points.length === 0) {
    return []
  }

  const uniquePoints = Array.from(
    new Map(
      points.map((point) => [
        `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`,
        point,
      ])
    ).values()
  )

  const cached =
    getCachedElevations(uniquePoints)

  const missing = uniquePoints.filter(
    (point) =>
      !cached.has(
        `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`
      )
  )

  if (missing.length > 0) {
    const fetched =
      await getElevations(missing)

    saveElevations(fetched)

    for (const result of fetched) {
      cached.set(
        `${result.latitude.toFixed(6)},${result.longitude.toFixed(6)}`,
        result.elevation_feet
      )
    }
  }

  return points.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
    elevation_feet:
      cached.get(
        `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`
      )!,
  }))
}
