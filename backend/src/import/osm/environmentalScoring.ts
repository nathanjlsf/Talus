import {
  nearestDistanceToGeometry,
} from "./geo.js"

export interface EnvironmentalGeometry {
  type: string
  id: number
  tags?: Record<string, string>
  geometry?: Array<{
    lat: number
    lon: number
  }>
  members?: Array<{
    type: string
    ref: number
    role: string
    geometry?: Array<{
      lat: number
      lon: number
    }>
  }>
}

export interface TrailPoint {
  lat: number
  lon: number
}

export interface EnvironmentalMeasurements {
  nearestForestMeters: number | null
  nearestWaterMeters: number | null
  nearestCoastalMeters: number | null
  forestFeaturesWithin500m: number
  waterFeaturesWithin100m: number
  waterFeaturesWithin500m: number
}

export interface EnvironmentalScores {
  forest: number
  water: number
  coastal: number
}

function proximityScore(
  distanceMeters: number | null,
  radiusMeters: number
): number {
  if (distanceMeters === null) {
    return 0
  }

  if (distanceMeters >= radiusMeters) {
    return 0
  }

  return 1 - distanceMeters / radiusMeters
}

function frequencyScore(
  count: number,
  maximum: number
): number {
  if (count <= 0) {
    return 0
  }

  return Math.min(count / maximum, 1)
}

export function calculateEnvironmentalScores(
  measurements: EnvironmentalMeasurements
): EnvironmentalScores {
  const forestProximity =
    proximityScore(
      measurements.nearestForestMeters,
      500
    )

  const forestFrequency =
    frequencyScore(
      measurements.forestFeaturesWithin500m,
      20
    )

  const waterProximity =
    proximityScore(
      measurements.nearestWaterMeters,
      500
    )

  const waterFrequency =
    frequencyScore(
      measurements.waterFeaturesWithin500m,
      40
    )

  const coastal =
    proximityScore(
      measurements.nearestCoastalMeters,
      500
    )

  return {
    forest:
      forestProximity * 0.7 +
      forestFrequency * 0.3,

    water:
      waterProximity * 0.4 +
      waterFrequency * 0.6,

    coastal,
  }
}

function getFeatureGeometries(
  feature: EnvironmentalGeometry
): TrailPoint[][] {
  const geometries: TrailPoint[][] = []

  if (
    feature.geometry &&
    feature.geometry.length > 0
  ) {
    geometries.push(feature.geometry)
  }

  for (
    const member of feature.members ?? []
  ) {
    if (
      member.geometry &&
      member.geometry.length > 0
    ) {
      geometries.push(member.geometry)
    }
  }

  return geometries
}

function getFeatureDistance(
  trailGeometry: TrailPoint[],
  feature: EnvironmentalGeometry
): number | null {
  const geometries =
    getFeatureGeometries(feature)

  if (geometries.length === 0) {
    return null
  }

  let minimumDistance =
    Infinity

  for (const geometry of geometries) {
    for (const trailPoint of trailGeometry) {
      const distance =
        nearestDistanceToGeometry(
          trailPoint,
          geometry
        )

      if (distance < minimumDistance) {
        minimumDistance = distance
      }
    }
  }

  return minimumDistance === Infinity
    ? null
    : minimumDistance
}

function isForest(
  feature: EnvironmentalGeometry
): boolean {
  return (
    feature.tags?.natural === "wood" ||
    feature.tags?.landuse === "forest"
  )
}

function isWater(
  feature: EnvironmentalGeometry
): boolean {
  const natural =
    feature.tags?.natural

  const waterway =
    feature.tags?.waterway

  if (natural === "water") {
    return true
  }

  return (
    waterway === "river" ||
    waterway === "stream" ||
    waterway === "tidal_channel" ||
    waterway === "canal" ||
    waterway === "dam" ||
    waterway === "weir"
  )
}

function isCoastal(
  feature: EnvironmentalGeometry
): boolean {
  return (
    feature.tags?.natural === "beach" ||
    feature.tags?.natural === "coastline"
  )
}

export function calculateEnvironmentalMeasurements(
  trailGeometry: TrailPoint[],
  features: EnvironmentalGeometry[]
): EnvironmentalMeasurements {
  const forestDistances: number[] = []
  const waterDistances: number[] = []
  const coastalDistances: number[] = []

  for (const feature of features) {
    const distance =
      getFeatureDistance(
        trailGeometry,
        feature
      )

    if (distance === null) {
      continue
    }

    if (isForest(feature)) {
      forestDistances.push(distance)
    }

    if (isWater(feature)) {
      waterDistances.push(distance)
    }

    if (isCoastal(feature)) {
      coastalDistances.push(distance)
    }
  }

  const nearestForestMeters =
    forestDistances.length > 0
      ? forestDistances.reduce(
          (minimum, distance) =>
            Math.min(
              minimum,
              distance
            ),
          Infinity
        )
      : null

    const nearestWaterMeters =
      waterDistances.length > 0
        ? waterDistances.reduce(
            (minimum, distance) =>
              Math.min(
                minimum,
                distance
            ),
            Infinity
          )
        : null

    const nearestCoastalMeters =
      coastalDistances.length > 0
        ? coastalDistances.reduce(
            (minimum, distance) =>
              Math.min(
                minimum,
                distance
            ),
            Infinity
          )
        : null

  return {
    nearestForestMeters,
    nearestWaterMeters,
    nearestCoastalMeters,

    forestFeaturesWithin500m:
      forestDistances.filter(
        (distance) =>
          distance <= 500
      ).length,

    waterFeaturesWithin100m:
      waterDistances.filter(
        (distance) =>
          distance <= 100
      ).length,

    waterFeaturesWithin500m:
      waterDistances.filter(
        (distance) =>
          distance <= 500
      ).length,
  }
}
