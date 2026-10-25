import {
  getAttributeValue,
  LEARNED_ATTRIBUTES,
  type TrailAttributes,
} from "./trailAttributes.js"

const ATTRIBUTE_DISTANCE_LIMIT = 0.35
const OVERLAP_LIMIT = 0.6
const MISSING_VALUE = 0.5

export interface DiversifiableTrail extends TrailAttributes {
  name: string
  location: string | null
  park_name: string | null
  min_latitude?: number
  max_latitude?: number
  min_longitude?: number
  max_longitude?: number
}

function normalizeLabel(
  value: string | null | undefined
): string | null {
  if (!value) {
    return null
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")

  return normalized.length > 0
    ? normalized
    : null
}

function sameNameAndPlace(
  first: DiversifiableTrail,
  second: DiversifiableTrail
): boolean {
  const firstName = normalizeLabel(first.name)
  const secondName = normalizeLabel(second.name)

  if (
    !firstName ||
    firstName !== secondName
  ) {
    return false
  }

  const firstPark = normalizeLabel(first.park_name)
  const secondPark = normalizeLabel(second.park_name)

  if (
    firstPark &&
    firstPark === secondPark
  ) {
    return true
  }

  const firstLocation = normalizeLabel(
    first.location
  )
  const secondLocation = normalizeLabel(
    second.location
  )

  return (
    firstLocation !== null &&
    firstLocation === secondLocation
  )
}

function hasBounds(
  trail: DiversifiableTrail
): trail is DiversifiableTrail & {
  min_latitude: number
  max_latitude: number
  min_longitude: number
  max_longitude: number
} {
  return (
    typeof trail.min_latitude === "number" &&
    typeof trail.max_latitude === "number" &&
    typeof trail.min_longitude === "number" &&
    typeof trail.max_longitude === "number"
  )
}

function overlapRatio(
  first: DiversifiableTrail,
  second: DiversifiableTrail
): number {
  if (!hasBounds(first) || !hasBounds(second)) {
    return 0
  }

  const latitudeOverlap = Math.max(
    0,
    Math.min(first.max_latitude, second.max_latitude) -
      Math.max(first.min_latitude, second.min_latitude)
  )

  const longitudeOverlap = Math.max(
    0,
    Math.min(
      first.max_longitude,
      second.max_longitude
    ) -
      Math.max(
        first.min_longitude,
        second.min_longitude
      )
  )

  const intersection =
    latitudeOverlap * longitudeOverlap

  const firstArea = Math.max(
    0,
    first.max_latitude - first.min_latitude
  ) * Math.max(
    0,
    first.max_longitude - first.min_longitude
  )

  const secondArea = Math.max(
    0,
    second.max_latitude - second.min_latitude
  ) * Math.max(
    0,
    second.max_longitude - second.min_longitude
  )

  const smaller = Math.min(firstArea, secondArea)

  if (smaller <= 0) {
    return 0
  }

  return intersection / smaller
}

function attributeDistance(
  first: DiversifiableTrail,
  second: DiversifiableTrail
): number {
  let squared = 0

  for (const attribute of LEARNED_ATTRIBUTES) {
    const firstValue =
      getAttributeValue(first, attribute) ??
      MISSING_VALUE

    const secondValue =
      getAttributeValue(second, attribute) ??
      MISSING_VALUE

    const difference = firstValue - secondValue

    squared += difference * difference
  }

  return Math.sqrt(squared)
}

export function isNearDuplicate(
  first: DiversifiableTrail,
  second: DiversifiableTrail
): boolean {
  if (sameNameAndPlace(first, second)) {
    return true
  }

  return (
    overlapRatio(first, second) > OVERLAP_LIMIT &&
    attributeDistance(first, second) <
      ATTRIBUTE_DISTANCE_LIMIT
  )
}

export function diversifyRanked<
  T extends { trail: DiversifiableTrail },
>(ranked: T[]): T[] {
  const accepted: T[] = []
  const deferred: T[] = []

  for (const item of ranked) {
    const duplicate = accepted.some((chosen) =>
      isNearDuplicate(
        item.trail,
        chosen.trail
      )
    )

    if (duplicate) {
      deferred.push(item)
    } else {
      accepted.push(item)
    }
  }

  return [...accepted, ...deferred]
}
