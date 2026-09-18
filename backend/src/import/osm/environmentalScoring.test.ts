import { describe, expect, it } from "vitest"

import {
  calculateEnvironmentalMeasurements,
  calculateEnvironmentalScores,
} from "./environmentalScoring.js"

describe("calculateEnvironmentalScores", () => {
  it("gives a strong forest score when forest is nearby", () => {
    const scores =
      calculateEnvironmentalScores({
        nearestForestMeters: 0,
        nearestWaterMeters: null,
        nearestCoastalMeters: null,
        forestFeaturesWithin500m: 10,
        waterFeaturesWithin100m: 0,
        waterFeaturesWithin500m: 0,
      })

    expect(scores.forest).toBeGreaterThan(0.8)
  })

  it("gives a strong coastal score when the coast is nearby", () => {
    const scores =
      calculateEnvironmentalScores({
        nearestForestMeters: null,
        nearestWaterMeters: 0,
        nearestCoastalMeters: 100,
        forestFeaturesWithin500m: 0,
        waterFeaturesWithin100m: 10,
        waterFeaturesWithin500m: 30,
      })

    expect(scores.coastal).toBeGreaterThan(0.7)
    expect(scores.water).toBeGreaterThan(0.7)
  })

  it("gives a low score when an environment is far away", () => {
    const scores =
      calculateEnvironmentalScores({
        nearestForestMeters: 500,
        nearestWaterMeters: 500,
        nearestCoastalMeters: 500,
        forestFeaturesWithin500m: 0,
        waterFeaturesWithin100m: 0,
        waterFeaturesWithin500m: 0,
      })

    expect(scores.forest).toBeLessThan(0.3)
    expect(scores.water).toBeLessThan(0.3)
    expect(scores.coastal).toBeLessThan(0.3)
  })

  it("handles missing environmental features", () => {
    const scores =
      calculateEnvironmentalScores({
        nearestForestMeters: null,
        nearestWaterMeters: null,
        nearestCoastalMeters: null,
        forestFeaturesWithin500m: 0,
        waterFeaturesWithin100m: 0,
        waterFeaturesWithin500m: 0,
      })

    expect(scores.forest).toBe(0)
    expect(scores.water).toBe(0)
    expect(scores.coastal).toBe(0)
  })

  it(
  "ignores ditches as water features",
  () => {
    const measurements =
      calculateEnvironmentalMeasurements(
        [
          {
            lat: 37.25,
            lon: -122.2,
          },
        ],
        [
          {
            type: "way",
            id: 1,
            tags: {
              waterway: "ditch",
            },
            geometry: [
              {
                lat: 37.25,
                lon: -122.2,
              },
            ],
          },
        ]
      )

    expect(
      measurements.nearestWaterMeters
    ).toBeNull()

    expect(
      measurements.waterFeaturesWithin100m
    ).toBe(0)

    expect(
      measurements.waterFeaturesWithin500m
    ).toBe(0)
  }
)

it(
  "keeps streams as water features",
  () => {
    const measurements =
      calculateEnvironmentalMeasurements(
        [
          {
            lat: 37.25,
            lon: -122.2,
          },
        ],
        [
          {
            type: "way",
            id: 2,
            tags: {
              waterway: "stream",
            },
            geometry: [
              {
                lat: 37.25,
                lon: -122.2,
              },
            ],
          },
        ]
      )

    expect(
      measurements.nearestWaterMeters
    ).toBe(0)

    expect(
      measurements.waterFeaturesWithin100m
    ).toBe(1)

    expect(
      measurements.waterFeaturesWithin500m
    ).toBe(1)
  })
})
