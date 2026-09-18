import {
  calculateEnvironmentalMeasurements,
  calculateEnvironmentalScores,
} from "./environmentalScoring.js"

import type {
  EnvironmentalGeometry,
  EnvironmentalMeasurements,
  EnvironmentalScores,
  TrailPoint,
} from "./environmentalScoring.js"

export interface EnvironmentalEnrichment {
  measurements: EnvironmentalMeasurements
  scores: EnvironmentalScores
}

export function enrichEnvironmentalData(
  trailGeometry: TrailPoint[],
  features: EnvironmentalGeometry[]
): EnvironmentalEnrichment {
  const measurements =
    calculateEnvironmentalMeasurements(
      trailGeometry,
      features
    )

  const scores =
    calculateEnvironmentalScores(
      measurements
    )

  return {
    measurements,
    scores,
  }
}
