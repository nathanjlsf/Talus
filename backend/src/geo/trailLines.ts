export interface WayPoint {
  way_id: number
  latitude: number
  longitude: number
}

export function groupPointsByWay<T extends WayPoint>(
  points: T[]
): T[][] {
  const lines: T[][] = []

  for (const point of points) {
    const current = lines[lines.length - 1]

    if (
      !current ||
      current[0]?.way_id !== point.way_id
    ) {
      lines.push([point])
    } else {
      current.push(point)
    }
  }

  return lines
}

export interface Bounds {
  minLatitude: number
  maxLatitude: number
  minLongitude: number
  maxLongitude: number
}

export function boundsFromPoints(
  points: Array<{
    latitude: number
    longitude: number
  }>
): Bounds | null {
  if (points.length === 0) {
    return null
  }

  let minLatitude = Infinity
  let maxLatitude = -Infinity
  let minLongitude = Infinity
  let maxLongitude = -Infinity

  for (const point of points) {
    minLatitude = Math.min(
      minLatitude,
      point.latitude
    )
    maxLatitude = Math.max(
      maxLatitude,
      point.latitude
    )
    minLongitude = Math.min(
      minLongitude,
      point.longitude
    )
    maxLongitude = Math.max(
      maxLongitude,
      point.longitude
    )
  }

  return {
    minLatitude,
    maxLatitude,
    minLongitude,
    maxLongitude,
  }
}

// Drops points that barely move the line. Endpoints stay.
export function simplifyPath<
  T extends {
    latitude: number
    longitude: number
  },
>(
  points: T[],
  toleranceDegrees: number
): T[] {
  if (points.length <= 2) {
    return points
  }

  const minimum =
    toleranceDegrees * toleranceDegrees

  const kept: T[] = [points[0]!]

  for (
    let index = 1;
    index < points.length - 1;
    index += 1
  ) {
    const point = points[index]!
    const last = kept[kept.length - 1]!

    const latitudeDelta =
      point.latitude - last.latitude

    const longitudeDelta =
      point.longitude - last.longitude

    if (
      latitudeDelta * latitudeDelta +
        longitudeDelta * longitudeDelta >=
      minimum
    ) {
      kept.push(point)
    }
  }

  kept.push(points[points.length - 1]!)

  return kept
}

export function parseBbox(
  value: string
): Bounds | null {
  const parts = value.split(",").map(Number)

  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isFinite(part))
  ) {
    return null
  }

  const [minLongitude, minLatitude, maxLongitude, maxLatitude] =
    parts as [number, number, number, number]

  if (
    minLongitude >= maxLongitude ||
    minLatitude >= maxLatitude ||
    minLatitude < -90 ||
    maxLatitude > 90 ||
    minLongitude < -180 ||
    maxLongitude > 180
  ) {
    return null
  }

  return {
    minLatitude,
    maxLatitude,
    minLongitude,
    maxLongitude,
  }
}
