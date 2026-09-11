import type { OsmWay } from "./overpass.js"
import type { NormalizedTrail } from "./normalize.js"

export interface TrailGroup {
  name: string
  ways: OsmWay[]
  normalizedWays: NormalizedTrail[]
  distance_miles: number
  relation_ids: number[]
}

const CONNECTIVITY_THRESHOLD_METERS = 30

function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const earthRadius = 6371000

  const lat1Radians =
    (lat1 * Math.PI) / 180

  const lat2Radians =
    (lat2 * Math.PI) / 180

  const deltaLat =
    ((lat2 - lat1) * Math.PI) / 180

  const deltaLon =
    ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1Radians) *
      Math.cos(lat2Radians) *
      Math.sin(deltaLon / 2) ** 2

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )

  return earthRadius * c
}

function waysAreConnected(
  first: OsmWay,
  second: OsmWay
): boolean {
  const firstGeometry =
    first.geometry

  const secondGeometry =
    second.geometry

  if (
    !firstGeometry ||
    !secondGeometry ||
    firstGeometry.length === 0 ||
    secondGeometry.length === 0
  ) {
    return false
  }

  const firstStart =
    firstGeometry[0]!

  const firstEnd =
    firstGeometry[
      firstGeometry.length - 1
    ]!

  const secondStart =
    secondGeometry[0]!

  const secondEnd =
    secondGeometry[
      secondGeometry.length - 1
    ]!

  const distances = [
    distanceMeters(
      firstStart.lat,
      firstStart.lon,
      secondStart.lat,
      secondStart.lon
    ),
    distanceMeters(
      firstStart.lat,
      firstStart.lon,
      secondEnd.lat,
      secondEnd.lon
    ),
    distanceMeters(
      firstEnd.lat,
      firstEnd.lon,
      secondStart.lat,
      secondStart.lon
    ),
    distanceMeters(
      firstEnd.lat,
      firstEnd.lon,
      secondEnd.lat,
      secondEnd.lon
    ),
  ]

  return distances.some(
    (distance) =>
      distance <=
      CONNECTIVITY_THRESHOLD_METERS
  )
}

function distanceBetweenWays(
  first: OsmWay,
  second: OsmWay
): number {
  const firstGeometry =
    first.geometry

  const secondGeometry =
    second.geometry

  if (
    !firstGeometry ||
    !secondGeometry ||
    firstGeometry.length === 0 ||
    secondGeometry.length === 0
  ) {
    return Infinity
  }

  const firstStart =
    firstGeometry[0]!

  const firstEnd =
    firstGeometry[
      firstGeometry.length - 1
    ]!

  const secondStart =
    secondGeometry[0]!

  const secondEnd =
    secondGeometry[
      secondGeometry.length - 1
    ]!

  return Math.min(
    distanceMeters(
      firstStart.lat,
      firstStart.lon,
      secondStart.lat,
      secondStart.lon
    ),
    distanceMeters(
      firstStart.lat,
      firstStart.lon,
      secondEnd.lat,
      secondEnd.lon
    ),
    distanceMeters(
      firstEnd.lat,
      firstEnd.lon,
      secondStart.lat,
      secondStart.lon
    ),
    distanceMeters(
      firstEnd.lat,
      firstEnd.lon,
      secondEnd.lat,
      secondEnd.lon
    )
  )
}

function reverseWay(
  way: OsmWay
): OsmWay {
  if (!way.geometry) {
    return way
  }

  return {
    ...way,
    geometry: [
      ...way.geometry,
    ].reverse(),
  }
}

function orientWayToConnect(
  way: OsmWay,
  previousWay: OsmWay
): OsmWay {
  if (
    !way.geometry ||
    !previousWay.geometry ||
    way.geometry.length === 0 ||
    previousWay.geometry.length === 0
  ) {
    return way
  }

  const previousEnd =
    previousWay.geometry[
      previousWay.geometry.length - 1
    ]!

  const wayStart =
    way.geometry[0]!

  const wayEnd =
    way.geometry[
      way.geometry.length - 1
    ]!

  const startDistance =
    distanceMeters(
      previousEnd.lat,
      previousEnd.lon,
      wayStart.lat,
      wayStart.lon
    )

  const endDistance =
    distanceMeters(
      previousEnd.lat,
      previousEnd.lon,
      wayEnd.lat,
      wayEnd.lon
    )

  if (endDistance < startDistance) {
    return reverseWay(way)
  }

  return way
}

function orderConnectedWays(
  ways: OsmWay[]
): OsmWay[] {
  if (ways.length <= 1) {
    return ways
  }

  const remaining =
    [...ways]

  const ordered: OsmWay[] = []

  const first =
    remaining.shift()!

  ordered.push(first)

  while (remaining.length > 0) {
    const previous =
      ordered[ordered.length - 1]!

    let bestIndex = -1
    let bestDistance = Infinity

    for (
      let index = 0;
      index < remaining.length;
      index++
    ) {
      const candidate =
        remaining[index]!

      const distance =
        distanceBetweenWays(
          previous,
          candidate
        )

      if (
        distance < bestDistance
      ) {
        bestDistance = distance
        bestIndex = index
      }
    }

    if (bestIndex === -1) {
      break
    }

    const next =
      remaining.splice(
        bestIndex,
        1
      )[0]!

    const oriented =
      orientWayToConnect(
        next,
        previous
      )

    ordered.push(oriented)
  }

  return ordered
}

function normalizeName(
  name: string
): string {
  return name
    .trim()
    .toLowerCase()
}

export function groupTrails(
  ways: OsmWay[],
  normalizedWays: NormalizedTrail[],
  relationWayIds: Map<
    number,
    number[]
  >
): TrailGroup[] {
  const waysById = new Map(
    ways.map((way) => [
      way.id,
      way,
    ])
  )

  const normalizedByName =
    new Map<
      string,
      Array<{
        way: OsmWay
        normalized: NormalizedTrail
      }>
    >()

  for (const normalized of normalizedWays) {
    const wayId =
      Number(normalized.source_id)

    const way =
      waysById.get(wayId)

    if (!way) {
      continue
    }

    const key =
      normalizeName(normalized.name)

    const existing =
      normalizedByName.get(key) ?? []

    existing.push({
      way,
      normalized,
    })

    normalizedByName.set(
      key,
      existing
    )
  }

  const groups: TrailGroup[] = []

  for (const entries of
    normalizedByName.values()) {
    const visited =
      new Set<number>()

    for (const entry of entries) {
      if (
        visited.has(entry.way.id)
      ) {
        continue
      }

      const component:
        typeof entries = []

      const queue = [entry]

      visited.add(
        entry.way.id
      )

      while (
        queue.length > 0
      ) {
        const current =
          queue.shift()!

        component.push(
          current
        )

        for (
          const candidate of
            entries
        ) {
          if (
            visited.has(
              candidate.way.id
            )
          ) {
            continue
          }

          if (
            waysAreConnected(
              current.way,
              candidate.way
            )
          ) {
            visited.add(
              candidate.way.id
            )

            queue.push(
              candidate
            )
          }
        }
      }

      const orderedWays =
        orderConnectedWays(
          component.map(
            (item) =>
              item.way
          )
        )

      const normalizedByWayId =
        new Map(
          component.map(
            (item) => [
              item.way.id,
              item.normalized,
            ]
          )
        )

      const orderedNormalizedWays =
        orderedWays.map(
          (way) =>
            normalizedByWayId.get(
              way.id
            )!
        )

      const relationIds =
        new Set<number>()

      for (
        const way of orderedWays
      ) {
        const ids =
          relationWayIds.get(
            way.id
          ) ?? []

        for (
          const id of ids
        ) {
          relationIds.add(id)
        }
      }

      groups.push({
        name:
          orderedNormalizedWays[0]!
            .name,

        ways:
          orderedWays,

        normalizedWays:
          orderedNormalizedWays,

        distance_miles:
          orderedNormalizedWays.reduce(
            (total, normalized) =>
              total +
              normalized.distance_miles,
            0
          ),

        relation_ids:
          Array.from(
            relationIds
          ),
      })
    }
  }

  return groups
}
