export interface GeometryPoint {
  latitude: number
  longitude: number
}

const EARTH_RADIUS_METERS = 6_371_000
const SAMPLE_DISTANCE_METERS = 100

function toRadians(
  degrees: number
): number {
  return (
    degrees *
    Math.PI /
    180
  )
}

function distanceBetweenPoints(
  first: GeometryPoint,
  second: GeometryPoint
): number {
  const lat1 =
    toRadians(first.latitude)

  const lat2 =
    toRadians(second.latitude)

  const deltaLat =
    toRadians(
      second.latitude -
        first.latitude
    )

  const deltaLon =
    toRadians(
      second.longitude -
        first.longitude
    )

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

  return (
    EARTH_RADIUS_METERS * c
  )
}

export function sampleGeometry(
  points: GeometryPoint[]
): GeometryPoint[] {
  if (points.length <= 2) {
    return points
  }

  const sampled: GeometryPoint[] = [
    points[0]!,
  ]

  let distanceSinceSample = 0

  for (
    let index = 1;
    index < points.length;
    index++
  ) {
    const previous =
      points[index - 1]!

    const current =
      points[index]!

    distanceSinceSample +=
      distanceBetweenPoints(
        previous,
        current
      )

    if (
      distanceSinceSample >=
      SAMPLE_DISTANCE_METERS
    ) {
      sampled.push(current)
      distanceSinceSample = 0
    }
  }

  const lastPoint =
    points[points.length - 1]!

  const lastSample =
    sampled[sampled.length - 1]!

  if (
    lastSample !== lastPoint
  ) {
    sampled.push(lastPoint)
  }

  return sampled
}
