import { describe, expect, it } from "vitest"

import {
  calculatePreferences,
} from "./calculatePreferences.js"

describe("calculatePreferences", () => {
  const trails = [
    {
      id: 1,
      scenic_score: 9,
      forest_score: 3,
      coastal_score: 10,
      solitude_score: 5,
    },
    {
      id: 2,
      scenic_score: 6,
      forest_score: 8,
      coastal_score: 2,
      solitude_score: 7,
    },
  ]

  it("learns from a comparison", () => {
    const preferences =
      calculatePreferences(
        [
          {
            winnerTrailId: 1,
            loserTrailId: 2,
          },
        ],
        trails
      )

    const scenic = preferences.find(
      (preference) =>
        preference.attribute === "scenic"
    )

    const coastal = preferences.find(
      (preference) =>
        preference.attribute === "coastal"
    )

    expect(scenic?.score).toBeGreaterThan(0)
    expect(coastal?.score).toBeGreaterThan(0)
  })

  it("detects preference against an attribute", () => {
    const preferences =
      calculatePreferences(
        [
          {
            winnerTrailId: 1,
            loserTrailId: 2,
          },
        ],
        trails
      )

    const forest = preferences.find(
      (preference) =>
        preference.attribute === "forest"
    )

    expect(forest?.score).toBeLessThan(50)
  })

  it("returns zero confidence without evidence", () => {
    const preferences =
      calculatePreferences([], trails)

    for (const preference of preferences) {
      expect(preference.score).toBe(50)
      expect(preference.confidence).toBe(0)
    }
  })

  it("increases confidence with more comparisons", () => {
    const preferences =
      calculatePreferences(
        [
          {
            winnerTrailId: 1,
            loserTrailId: 2,
          },
          {
            winnerTrailId: 1,
            loserTrailId: 2,
          },
          {
            winnerTrailId: 1,
            loserTrailId: 2,
          },
        ],
        trails
      )

    const scenic = preferences.find(
      (preference) =>
        preference.attribute === "scenic"
    )

    expect(scenic?.confidence).toBe(0.6)
  })
})