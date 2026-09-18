export interface GeoPoint {
  lat: number
  lon: number
}

const EARTH_RADIUS_METERS = 6371000

export function distanceMeters(
  first: GeoPoint,
  second: GeoPoint
): number {
  const lat1 =
    (first.lat * Math.PI) / 180
  const lat2 =
    (second.lat * Math.PI) / 180

  const deltaLat =
    ((second.lat - first.lat) * Math.PI) / 180

  const deltaLon =
    ((second.lon - first.lon) * Math.PI) / 180

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) ** 2

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )

  return EARTH_RADIUS_METERS * c
}

export function nearestDistanceToGeometry(
  point: GeoPoint,
  geometry: GeoPoint[]
): number {
  if (geometry.length === 0) {
    return Infinity
  }

  return Math.min(
    ...geometry.map((geometryPoint) =>
      distanceMeters(
        point,
        geometryPoint
      )
    )
  )
}
