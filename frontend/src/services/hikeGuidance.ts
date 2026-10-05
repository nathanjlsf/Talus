export interface LngLat {
  longitude: number
  latitude: number
}

export interface PaceSample {
  recordedAt: string
  latitude: number
  longitude: number
  accuracy: number | null
}

export interface TrailGuidance {
  snapped: LngLat
  distanceOffMeters: number
  offRoute: boolean
  progress: number
  alongMeters: number
  totalMeters: number
  remainingMeters: number
  completed: number[][]
}

export interface FinishEstimate {
  seconds: number
  basis: "pace" | "trail"
}

const EARTH_RADIUS_METERS = 6_371_000
const OFF_ROUTE_METERS = 40
const BACK_ON_ROUTE_METERS = 25
const CONNECT_METERS = 30
const LOOP_METERS = 40
const ON_TRAIL_ORIENT_METERS = 80
const MAX_ACCURACY_METERS = 30
const MIN_MOVING_SPEED = 0.3
const MAX_MOVING_SPEED = 5
const PACE_MIN_METERS = 200
const PACE_MIN_SECONDS = 90

export function distanceMeters(from: LngLat, to: LngLat) {
  const toRadians = (degrees: number) =>
    (degrees * Math.PI) / 180
  const latitudeDelta = toRadians(to.latitude - from.latitude)
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

function asLngLat(coordinate: number[]): LngLat | null {
  const longitude = coordinate[0]
  const latitude = coordinate[1]

  if (
    longitude === undefined ||
    latitude === undefined ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude)
  ) {
    return null
  }

  return { longitude, latitude }
}

function stitchPaths(paths: number[][][]): LngLat[][] {
  const unused: LngLat[][] = []

  for (const path of paths) {
    const line: LngLat[] = []

    for (const coordinate of path) {
      const point = asLngLat(coordinate)

      if (point) {
        line.push(point)
      }
    }

    if (line.length >= 2) {
      unused.push(line)
    }
  }

  const chains: LngLat[][] = []

  while (unused.length > 0) {
    let points = unused.pop()

    if (!points) {
      break
    }

    let grew = true

    while (grew) {
      grew = false

      for (let index = 0; index < unused.length; index += 1) {
        const line = unused[index]

        if (!line) {
          continue
        }

        const start = points[0]
        const end = points[points.length - 1]
        const lineStart = line[0]
        const lineEnd = line[line.length - 1]

        if (!start || !end || !lineStart || !lineEnd) {
          continue
        }

        if (distanceMeters(end, lineStart) <= CONNECT_METERS) {
          points = points.concat(line.slice(1))
        } else if (
          distanceMeters(end, lineEnd) <= CONNECT_METERS
        ) {
          points = points.concat([...line].reverse().slice(1))
        } else if (
          distanceMeters(start, lineEnd) <= CONNECT_METERS
        ) {
          points = line.slice(0, -1).concat(points)
        } else if (
          distanceMeters(start, lineStart) <= CONNECT_METERS
        ) {
          points = [...line].reverse().slice(0, -1).concat(points)
        } else {
          continue
        }

        unused.splice(index, 1)
        grew = true
        break
      }
    }

    chains.push(points)
  }

  return chains
}

function projectOntoSegment(
  point: LngLat,
  start: LngLat,
  end: LngLat
) {
  const latScale = Math.cos((start.latitude * Math.PI) / 180)
  const endX = (end.longitude - start.longitude) * latScale
  const endY = end.latitude - start.latitude
  const pointX = (point.longitude - start.longitude) * latScale
  const pointY = point.latitude - start.latitude
  const lengthSquared = endX * endX + endY * endY
  const fraction =
    lengthSquared === 0
      ? 0
      : Math.min(
          1,
          Math.max(
            0,
            (pointX * endX + pointY * endY) / lengthSquared
          )
        )
  const snapped = {
    longitude:
      start.longitude +
      (end.longitude - start.longitude) * fraction,
    latitude:
      start.latitude + (end.latitude - start.latitude) * fraction,
  }

  return {
    fraction,
    snapped,
    distance: distanceMeters(point, snapped),
  }
}

function snapToChain(position: LngLat, points: LngLat[]) {
  const cumulative = [0]

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]

    if (!previous || !current) {
      continue
    }

    cumulative.push(
      (cumulative[index - 1] ?? 0) +
        distanceMeters(previous, current)
    )
  }

  const totalMeters = cumulative[cumulative.length - 1] ?? 0
  let bestDistance = Infinity
  let alongMeters = 0
  let snapped = points[0] ?? position

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1]
    const end = points[index]

    if (!start || !end) {
      continue
    }

    const projection = projectOntoSegment(position, start, end)

    if (projection.distance < bestDistance) {
      const segmentMeters =
        (cumulative[index] ?? 0) - (cumulative[index - 1] ?? 0)
      bestDistance = projection.distance
      alongMeters =
        (cumulative[index - 1] ?? 0) +
        projection.fraction * segmentMeters
      snapped = projection.snapped
    }
  }

  return {
    snapped,
    distanceOffMeters: bestDistance,
    alongMeters,
    totalMeters,
  }
}

function orientToOrigin(points: LngLat[], origin: LngLat | null) {
  if (!origin || points.length < 2) {
    return points
  }

  const start = points[0]
  const end = points[points.length - 1]

  if (!start || !end || distanceMeters(start, end) < LOOP_METERS) {
    return points
  }

  const snap = snapToChain(origin, points)

  if (
    snap.distanceOffMeters <= ON_TRAIL_ORIENT_METERS &&
    snap.alongMeters > snap.totalMeters / 2
  ) {
    return [...points].reverse()
  }

  return points
}

function completedLine(points: LngLat[], alongMeters: number) {
  const first = points[0]

  if (!first) {
    return []
  }

  const line: number[][] = [[first.longitude, first.latitude]]
  let walked = 0

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]

    if (!previous || !current) {
      continue
    }

    const step = distanceMeters(previous, current)

    if (walked + step >= alongMeters) {
      const fraction =
        step === 0 ? 0 : (alongMeters - walked) / step
      line.push([
        previous.longitude +
          (current.longitude - previous.longitude) * fraction,
        previous.latitude +
          (current.latitude - previous.latitude) * fraction,
      ])
      break
    }

    walked += step
    line.push([current.longitude, current.latitude])
  }

  return line
}

export function isOffRoute(
  distanceOffMeters: number,
  wasOffRoute: boolean
) {
  if (wasOffRoute) {
    return distanceOffMeters > BACK_ON_ROUTE_METERS
  }

  return distanceOffMeters > OFF_ROUTE_METERS
}

export function guideOnTrail(input: {
  paths: number[][][]
  position: LngLat
  origin: LngLat | null
  wasOffRoute: boolean
}): TrailGuidance | null {
  const chains = stitchPaths(input.paths)

  if (chains.length === 0) {
    return null
  }

  let nearestChain = chains[0]
  let nearestDistance = Infinity

  for (const chain of chains) {
    const snap = snapToChain(input.position, chain)

    if (snap.distanceOffMeters < nearestDistance) {
      nearestDistance = snap.distanceOffMeters
      nearestChain = chain
    }
  }

  if (!nearestChain || nearestChain.length < 2) {
    return null
  }

  const oriented = orientToOrigin(nearestChain, input.origin)
  const snap = snapToChain(input.position, oriented)

  if (snap.totalMeters <= 0) {
    return null
  }

  const alongMeters = Math.min(
    snap.totalMeters,
    Math.max(0, snap.alongMeters)
  )
  const progress = alongMeters / snap.totalMeters

  return {
    snapped: snap.snapped,
    distanceOffMeters: snap.distanceOffMeters,
    offRoute: isOffRoute(
      snap.distanceOffMeters,
      input.wasOffRoute
    ),
    progress,
    alongMeters,
    totalMeters: snap.totalMeters,
    remainingMeters: snap.totalMeters - alongMeters,
    completed: completedLine(oriented, alongMeters),
  }
}

export function movingEffort(points: PaceSample[]) {
  const usable = points
    .filter((point) => {
      if (
        !Number.isFinite(point.latitude) ||
        !Number.isFinite(point.longitude)
      ) {
        return false
      }

      if (Number.isNaN(Date.parse(point.recordedAt))) {
        return false
      }

      return (
        point.accuracy === null ||
        point.accuracy <= MAX_ACCURACY_METERS
      )
    })
    .sort(
      (left, right) =>
        Date.parse(left.recordedAt) - Date.parse(right.recordedAt)
    )

  let meters = 0
  let movingSeconds = 0

  for (let index = 1; index < usable.length; index += 1) {
    const from = usable[index - 1]
    const to = usable[index]

    if (!from || !to) {
      continue
    }

    const seconds =
      (Date.parse(to.recordedAt) - Date.parse(from.recordedAt)) /
      1000

    if (seconds <= 0) {
      continue
    }

    const step = distanceMeters(from, to)
    const speed = step / seconds

    if (speed > MAX_MOVING_SPEED) {
      continue
    }

    meters += step

    if (speed >= MIN_MOVING_SPEED) {
      movingSeconds += seconds
    }
  }

  return { meters, movingSeconds }
}

export function finishEstimate(input: {
  remainingMeters: number
  traveledMeters: number
  movingSeconds: number
  estimatedTimeMinutes: number | null
  routeMeters: number
}): FinishEstimate | null {
  if (input.remainingMeters <= 30) {
    return { seconds: 0, basis: "pace" }
  }

  if (
    input.traveledMeters >= PACE_MIN_METERS &&
    input.movingSeconds >= PACE_MIN_SECONDS
  ) {
    return {
      seconds:
        input.remainingMeters *
        (input.movingSeconds / input.traveledMeters),
      basis: "pace",
    }
  }

  if (
    input.estimatedTimeMinutes &&
    input.estimatedTimeMinutes > 0 &&
    input.routeMeters > 0
  ) {
    return {
      seconds:
        input.estimatedTimeMinutes *
        60 *
        (input.remainingMeters / input.routeMeters),
      basis: "trail",
    }
  }

  return null
}

const SUN_DAY_MS = 86_400_000
const SUN_J1970 = 2_440_588
const SUN_J2000 = 2_451_545
const SUN_OBLIQUITY = (Math.PI / 180) * 23.4397

function toDays(date: Date) {
  return date.valueOf() / SUN_DAY_MS - 0.5 + SUN_J1970 - SUN_J2000
}

function fromJulianDay(julian: number) {
  return new Date((julian + 0.5 - SUN_J1970) * SUN_DAY_MS)
}

function solarMeanAnomaly(days: number) {
  return (
    (Math.PI / 180) * (357.5291 + 0.98560028 * days)
  )
}

function eclipticLongitude(anomaly: number) {
  const center =
    (Math.PI / 180) *
    (1.9148 * Math.sin(anomaly) +
      0.02 * Math.sin(2 * anomaly) +
      0.0003 * Math.sin(3 * anomaly))
  const perihelion = (Math.PI / 180) * 102.9372

  return anomaly + center + perihelion + Math.PI
}

function solarDeclination(longitude: number) {
  return Math.asin(
    Math.sin(longitude) * Math.sin(SUN_OBLIQUITY)
  )
}

function julianCycle(days: number, lw: number) {
  return Math.round(days - 0.0009 - lw / (2 * Math.PI))
}

function approxTransit(hourAngle: number, lw: number, cycle: number) {
  return 0.0009 + (hourAngle + lw) / (2 * Math.PI) + cycle
}

function solarTransit(
  days: number,
  anomaly: number,
  longitude: number
) {
  return (
    SUN_J2000 +
    days +
    0.0053 * Math.sin(anomaly) -
    0.0069 * Math.sin(2 * longitude)
  )
}

function hourAngle(
  altitude: number,
  latitude: number,
  declination: number
) {
  const cosine =
    (Math.sin(altitude) -
      Math.sin(latitude) * Math.sin(declination)) /
    (Math.cos(latitude) * Math.cos(declination))

  if (cosine < -1 || cosine > 1) {
    return null
  }

  return Math.acos(cosine)
}

export function sunsetAt(
  when: Date,
  latitude: number,
  longitude: number
): Date | null {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -66 ||
    latitude > 66
  ) {
    return null
  }

  const lw = (Math.PI / 180) * -longitude
  const phi = (Math.PI / 180) * latitude
  const days = toDays(when)
  const cycle = julianCycle(days, lw)
  const transitDays = approxTransit(0, lw, cycle)
  const anomaly = solarMeanAnomaly(transitDays)
  const sunLongitude = eclipticLongitude(anomaly)
  const declination = solarDeclination(sunLongitude)
  const angle = hourAngle(
    (-0.833 * Math.PI) / 180,
    phi,
    declination
  )

  if (angle === null) {
    return null
  }

  return fromJulianDay(
    solarTransit(
      approxTransit(angle, lw, cycle),
      anomaly,
      sunLongitude
    )
  )
}

export function daylightNote(
  now: Date,
  etaSeconds: number,
  latitude: number,
  longitude: number,
  basis: FinishEstimate["basis"]
) {
  const sunset = sunsetAt(now, latitude, longitude)

  if (!sunset || etaSeconds <= 0) {
    return null
  }

  const finish = new Date(now.getTime() + etaSeconds * 1000)

  if (finish <= sunset || now >= sunset) {
    return null
  }

  if (basis === "pace") {
    return "At your pace you'd finish after sunset."
  }

  return "At this trail's usual pace you'd finish after sunset."
}
