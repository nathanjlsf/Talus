import { describe, expect, it } from "vitest"

import {
  enrichEnvironmentalData,
} from "./enrichEnvironmental.js"

describe("enrichEnvironmentalData", () => {
  it("converts environmental measurements into scores", () => {
    const result =
      enrichEnvironmentalData(
        [
          {
            lat: 37.25,
            lon: -122.20,
          },
        ],
        [
          {
            type: "way",
            id: 1,
            tags: {
              natural: "wood",
            },
            geometry: [
              {
                lat: 37.25,
                lon: -122.20,
              },
            ],
          },
        ]
      )

    expect(
      result.measurements.nearestForestMeters
    ).toBe(0)

    expect(
      result.scores.forest
    ).toBeGreaterThan(0)
  })
})
