import type {
  EnvironmentalGeometry,
  TrailPoint,
} from "./environmentalScoring.js"

interface BoundingBox {
  minLat: number
  minLon: number
  maxLat: number
  maxLon: number
}

function getFeatureBoundingBox(
  feature: EnvironmentalGeometry
): BoundingBox | null {
  const points: TrailPoint[] = []

  for (const point of feature.geometry ?? []) {
    points.push({
      lat: point.lat,
      lon: point.lon,
    })
  }

  for (const member of feature.members ?? []) {
    for (const point of member.geometry ?? []) {
      points.push({
        lat: point.lat,
        lon: point.lon,
      })
    }
  }

  if (points.length === 0) {
    return null
  }

  return {
    minLat: Math.min(
      ...points.map((point) => point.lat)
    ),
    maxLat: Math.max(
      ...points.map((point) => point.lat)
    ),
    minLon: Math.min(
      ...points.map((point) => point.lon)
    ),
    maxLon: Math.max(
      ...points.map((point) => point.lon)
    ),
  }
}

function boxesIntersect(
  first: BoundingBox,
  second: BoundingBox
): boolean {
  return !(
    first.maxLat < second.minLat ||
    first.minLat > second.maxLat ||
    first.maxLon < second.minLon ||
    first.minLon > second.maxLon
  )
}

function expandBoundingBox(
  box: BoundingBox,
  bufferMeters: number
): BoundingBox {
  const midLat =
    (box.minLat + box.maxLat) / 2

  const latBuffer =
    bufferMeters / 111320

  const lonBuffer =
    bufferMeters /
    (111320 *
      Math.cos(
        (midLat * Math.PI) / 180
      ))

  return {
    minLat: box.minLat - latBuffer,
    minLon: box.minLon - lonBuffer,
    maxLat: box.maxLat + latBuffer,
    maxLon: box.maxLon + lonBuffer,
  }
}

export function filterEnvironmentalFeatures(
  trailGeometry: TrailPoint[],
  features: EnvironmentalGeometry[],
  bufferMeters = 500
): EnvironmentalGeometry[] {
  if (trailGeometry.length === 0) {
    return []
  }

  const trailBox: BoundingBox = {
    minLat: Math.min(
      ...trailGeometry.map(
        (point) => point.lat
      )
    ),
    maxLat: Math.max(
      ...trailGeometry.map(
        (point) => point.lat
      )
    ),
    minLon: Math.min(
      ...trailGeometry.map(
        (point) => point.lon
      )
    ),
    maxLon: Math.max(
      ...trailGeometry.map(
        (point) => point.lon
      )
    ),
  }

  const searchBox =
    expandBoundingBox(
      trailBox,
      bufferMeters
    )

  return features.filter(
    (feature) => {
      const featureBox =
        getFeatureBoundingBox(
          feature
        )

      if (!featureBox) {
        return false
      }

      return boxesIntersect(
        searchBox,
        featureBox
      )
    }
  )
}
