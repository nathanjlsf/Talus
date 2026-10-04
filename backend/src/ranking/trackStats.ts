export type MomentMark = "view" | "climb" | "rest"

export interface TrackPoint {
  recordedAt: string
  latitude: number
  longitude: number
  accuracy: number | null
  moment: MomentMark | null
}

export interface LatLon {
  latitude: number
  longitude: number
}

export interface MileSplit {
  mile: number
  seconds: number
}

export interface LongStop {
  latitude: number
  longitude: number
  durationSeconds: number
  recordedAt: string
}

export interface TrailProgress {
  maxFraction: number
  endFraction: number
}

const EARTH_RADIUS_METERS = 6_371_000
const MILE_METERS = 1609.344
const MAX_ACCURACY_METERS = 30
const MIN_MOVING_SPEED = 0.3
const MAX_MOVING_SPEED = 5
const STOP_RADIUS_METERS = 40
const LONG_STOP_SECONDS = 180
const ON_TRAIL_METERS = 150

export function distanceMeters(
  from: LatLon,
  to: LatLon
): number {
  const toRadians = (degrees: number) =>
    (degrees * Math.PI) / 180

  const latitudeDelta = toRadians(
    to.latitude - from.latitude
  )
  const longitudeDelta = toRadians(
    to.longitude - from.longitude
  )
  const fromLatitude = toRadians(from.latitude)
  const toLatitude = toRadians(to.latitude)

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.asin(Math.min(1, Math.sqrt(haversine)))
  )
}

export function usablePoints(
  points: TrackPoint[]
): TrackPoint[] {
  return points
    .filter((point) => {
      if (!Number.isFinite(point.latitude)) {
        return false
      }

      if (!Number.isFinite(point.longitude)) {
        return false
      }

      if (Number.isNaN(Date.parse(point.recordedAt))) {
        return false
      }

      if (
        point.accuracy !== null &&
        point.accuracy > MAX_ACCURACY_METERS
      ) {
        return false
      }

      return true
    })
    .sort(
      (left, right) =>
        Date.parse(left.recordedAt) -
        Date.parse(right.recordedAt)
    )
}

interface Segment {
  meters: number
  movingSeconds: number
  from: TrackPoint
  to: TrackPoint
}

function segments(points: TrackPoint[]): Segment[] {
  const result: Segment[] = []

  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1]
    const to = points[index]

    if (!from || !to) {
      continue
    }

    const seconds =
      (Date.parse(to.recordedAt) -
        Date.parse(from.recordedAt)) /
      1000

    if (seconds <= 0) {
      continue
    }

    const meters = distanceMeters(from, to)
    const speed = meters / seconds

    if (speed > MAX_MOVING_SPEED) {
      continue
    }

    result.push({
      meters,
      movingSeconds:
        speed >= MIN_MOVING_SPEED ? seconds : 0,
      from,
      to,
    })
  }

  return result
}

export function trackDistanceMiles(
  points: TrackPoint[]
): number {
  const meters = segments(usablePoints(points))
    .reduce(
      (total, segment) => total + segment.meters,
      0
    )

  return meters / MILE_METERS
}

export function movingSeconds(
  points: TrackPoint[]
): number {
  const seconds = segments(usablePoints(points))
    .reduce(
      (total, segment) =>
        total + segment.movingSeconds,
      0
    )

  return Math.round(seconds)
}

export function durationSeconds(
  startedAt: string | null,
  endedAt: string | null,
  points: TrackPoint[]
): number {
  if (startedAt && endedAt) {
    const elapsed =
      Date.parse(endedAt) - Date.parse(startedAt)

    if (Number.isFinite(elapsed) && elapsed > 0) {
      return Math.round(elapsed / 1000)
    }
  }

  const ordered = usablePoints(points)
  const first = ordered[0]
  const last = ordered[ordered.length - 1]

  if (!first || !last) {
    return 0
  }

  return Math.max(
    0,
    Math.round(
      (Date.parse(last.recordedAt) -
        Date.parse(first.recordedAt)) /
        1000
    )
  )
}

export function paceSecondsPerMile(
  moving: number,
  miles: number
): number | null {
  if (miles <= 0.05 || moving <= 0) {
    return null
  }

  return moving / miles
}

export function mileSplits(
  points: TrackPoint[]
): MileSplit[] {
  const pieces = segments(usablePoints(points))
  const splits: MileSplit[] = []
  let consumed = 0
  let splitMoving = 0
  let mile = 1

  for (const piece of pieces) {
    let metersLeft = piece.meters
    let movingLeft = piece.movingSeconds

    while (
      metersLeft > 0 &&
      consumed + metersLeft >= mile * MILE_METERS
    ) {
      const needed = mile * MILE_METERS - consumed
      const ratio = needed / metersLeft

      splitMoving += movingLeft * ratio
      splits.push({
        mile,
        seconds: Math.round(splitMoving),
      })

      consumed += needed
      metersLeft -= needed
      movingLeft -= movingLeft * ratio
      splitMoving = 0
      mile += 1
    }

    consumed += metersLeft
    splitMoving += movingLeft
  }

  return splits
}

export function findLongStops(
  points: TrackPoint[]
): LongStop[] {
  const ordered = usablePoints(points)
  const stops: LongStop[] = []
  let clusterStart = 0

  function closeCluster(endIndex: number) {
    const start = ordered[clusterStart]
    const end = ordered[endIndex]

    if (!start || !end) {
      return
    }

    const elapsed =
      (Date.parse(end.recordedAt) -
        Date.parse(start.recordedAt)) /
      1000

    if (elapsed >= LONG_STOP_SECONDS) {
      stops.push({
        latitude: start.latitude,
        longitude: start.longitude,
        durationSeconds: Math.round(elapsed),
        recordedAt: start.recordedAt,
      })
    }
  }

  for (
    let index = 1;
    index < ordered.length;
    index++
  ) {
    const anchor = ordered[clusterStart]
    const current = ordered[index]

    if (!anchor || !current) {
      continue
    }

    if (
      distanceMeters(anchor, current) >
      STOP_RADIUS_METERS
    ) {
      closeCluster(index - 1)
      clusterStart = index
    }
  }

  if (ordered.length > 0) {
    closeCluster(ordered.length - 1)
  }

  return stops
}

export function momentCounts(
  points: TrackPoint[]
): Record<MomentMark, number> {
  const counts: Record<MomentMark, number> = {
    view: 0,
    climb: 0,
    rest: 0,
  }

  for (const point of points) {
    if (point.moment) {
      counts[point.moment] += 1
    }
  }

  return counts
}

function toLocalMeters(
  origin: LatLon,
  point: LatLon
) {
  const latitudeScale = 111_320
  const longitudeScale =
    latitudeScale *
    Math.cos((origin.latitude * Math.PI) / 180)

  return {
    x: (point.longitude - origin.longitude) * longitudeScale,
    y: (point.latitude - origin.latitude) * latitudeScale,
  }
}

function closestOnSegment(
  point: LatLon,
  start: LatLon,
  end: LatLon
): { distance: number; ratio: number } {
  const origin = start
  const target = toLocalMeters(origin, point)
  const segmentEnd = toLocalMeters(origin, end)
  const lengthSquared =
    segmentEnd.x * segmentEnd.x +
    segmentEnd.y * segmentEnd.y

  if (lengthSquared === 0) {
    return {
      distance: distanceMeters(point, start),
      ratio: 0,
    }
  }

  const ratio = Math.max(
    0,
    Math.min(
      1,
      (target.x * segmentEnd.x +
        target.y * segmentEnd.y) /
        lengthSquared
    )
  )

  const projected = {
    latitude:
      start.latitude +
      (end.latitude - start.latitude) * ratio,
    longitude:
      start.longitude +
      (end.longitude - start.longitude) * ratio,
  }

  return {
    distance: distanceMeters(point, projected),
    ratio,
  }
}

export function progressAlongTrail(
  track: LatLon[],
  lines: LatLon[][]
): TrailProgress | null {
  const vertices: LatLon[] = []
  const cumulative: number[] = []

  for (const line of lines) {
    for (const point of line) {
      const previous = vertices[vertices.length - 1]

      vertices.push(point)
      cumulative.push(
        previous
          ? cumulative[cumulative.length - 1]! +
            distanceMeters(previous, point)
          : 0
      )
    }
  }

  const total = cumulative[cumulative.length - 1]

  if (
    vertices.length < 2 ||
    total === undefined ||
    total <= 0
  ) {
    return null
  }

  const fractions: number[] = []

  for (const point of track) {
    let bestDistance = Infinity
    let bestAlong = 0

    for (
      let index = 1;
      index < vertices.length;
      index++
    ) {
      const start = vertices[index - 1]
      const end = vertices[index]

      if (!start || !end) {
        continue
      }

      const projected = closestOnSegment(
        point,
        start,
        end
      )
      const along =
        cumulative[index - 1]! +
        projected.ratio *
          (cumulative[index]! -
            cumulative[index - 1]!)

      if (projected.distance < bestDistance) {
        bestDistance = projected.distance
        bestAlong = along
      }
    }

    if (bestDistance <= ON_TRAIL_METERS) {
      fractions.push(bestAlong / total)
    }
  }

  const first = fractions[0]
  const last = fractions[fractions.length - 1]

  if (first === undefined || last === undefined) {
    return null
  }

  return {
    maxFraction: Math.max(...fractions),
    endFraction: last,
  }
}

export function didTurnAround(
  progress: TrailProgress | null,
  distanceMiles: number,
  trailDistanceMiles: number
): boolean {
  if (progress) {
    if (progress.maxFraction >= 0.85) {
      return false
    }

    if (progress.maxFraction < 0.7) {
      return true
    }

    return (
      progress.endFraction <
      progress.maxFraction - 0.1
    )
  }

  if (trailDistanceMiles <= 0) {
    return false
  }

  return distanceMiles / trailDistanceMiles < 0.7
}

export function completionFraction(
  progress: TrailProgress | null,
  distanceMiles: number,
  trailDistanceMiles: number
): number | null {
  if (progress) {
    return Math.max(
      0,
      Math.min(1, progress.maxFraction)
    )
  }

  if (trailDistanceMiles <= 0) {
    return distanceMiles > 0 ? 1 : null
  }

  if (distanceMiles <= 0) {
    return null
  }

  return Math.max(
    0,
    Math.min(1, distanceMiles / trailDistanceMiles)
  )
}

export interface TrackSummary {
  distanceMiles: number
  movingSeconds: number
  durationSeconds: number
  paceSecondsPerMile: number | null
  splits: MileSplit[]
  longStops: LongStop[]
  moments: Record<MomentMark, number>
  completionFraction: number | null
  turnedAround: boolean
}

export function summarizeTrack(input: {
  points: TrackPoint[]
  startedAt: string | null
  endedAt: string | null
  trailDistanceMiles: number
  trailLines: LatLon[][]
}): TrackSummary {
  const points = usablePoints(input.points)
  const distanceMiles = trackDistanceMiles(points)
  const progress = progressAlongTrail(
    points,
    input.trailLines
  )

  return {
    distanceMiles,
    movingSeconds: movingSeconds(points),
    durationSeconds: durationSeconds(
      input.startedAt,
      input.endedAt,
      points
    ),
    paceSecondsPerMile: paceSecondsPerMile(
      movingSeconds(points),
      distanceMiles
    ),
    splits: mileSplits(points),
    longStops: findLongStops(points),
    moments: momentCounts(input.points),
    completionFraction: completionFraction(
      progress,
      distanceMiles,
      input.trailDistanceMiles
    ),
    turnedAround: didTurnAround(
      progress,
      distanceMiles,
      input.trailDistanceMiles
    ),
  }
}
