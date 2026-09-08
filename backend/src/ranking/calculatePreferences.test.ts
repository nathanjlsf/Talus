import { describe, expect, it } from "vitest"

import {
  calculatePreferences,
} from "./calculatePreferences.js"

describe("calculatePreferences", () => {
  const trails = [
    {
      id: 1,
      distance_miles: 6,
      elevation_gain_feet: 1200,
      difficulty: "Hard",
      terrain: "Rocky",
      scenic_score: 0.9,
      nature_score: 0.3,
      solitude_score: 0.5,
    },
    {
      id: 2,
      distance_miles: 3,
      elevation_gain_feet: 400,
      difficulty: "Easy",
      terrain: "Paved",
      scenic_score: 0.6,
      nature_score: 0.8,
      solitude_score: 0.7,
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

    const distance = preferences.find(
      (preference) =>
        preference.attribute === "distance"
    )

    expect(scenic?.score).toBeGreaterThan(50)
    expect(distance?.score).toBeGreaterThan(50)
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

    const nature = preferences.find(
      (preference) =>
        preference.attribute === "nature"
    )

    expect(nature?.score).toBeLessThan(50)
  })

  it("returns zero confidence without evidence", () => {
    const preferences =
      calculatePreferences([], trails)

    for (const preference of preferences) {
      expect(preference.score).toBe(50)
      expect(preference.confidence).toBe(0)
    }
  })

  it("keeps confidence consistent across informative attributes", () => {
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

    const confidences =
      preferences.map(
        (preference) =>
          preference.confidence
      )

    expect(
      new Set(confidences).size
    ).toBe(1)
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

    expect(scenic?.confidence).toBe(0.32)
  })

    it("learns quantitative and categorical trail preferences", () => {
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

    const elevation = preferences.find(
      (preference) =>
        preference.attribute === "elevation"
    )

    const difficulty = preferences.find(
      (preference) =>
        preference.attribute === "difficulty"
    )

    const terrain = preferences.find(
      (preference) =>
        preference.attribute === "terrain"
    )

    expect(elevation?.score).toBeGreaterThan(50)
    expect(difficulty?.score).toBeGreaterThan(50)
    expect(terrain?.score).toBeGreaterThan(50)
  })

  it("moves toward neutral with contradictory comparisons", () => {
    const preferences =
      calculatePreferences(
        [
          {
            winnerTrailId: 1,
            loserTrailId: 2,
          },
          {
            winnerTrailId: 2,
            loserTrailId: 1,
          },
        ],
        trails
      )

    for (const preference of preferences) {
      expect(preference.score).toBe(50)
    }
  })

  it("gives diminishing influence to repeated comparisons", () => {
    const oneComparison =
      calculatePreferences(
        [
          {
            winnerTrailId: 1,
            loserTrailId: 2,
          },
        ],
        trails
      )

    const threeComparisons =
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

    const oneScore =
      oneComparison.find(
        (preference) =>
          preference.attribute === "scenic"
      )?.score ?? 50

    const threeScore =
      threeComparisons.find(
        (preference) =>
          preference.attribute === "scenic"
      )?.score ?? 50

    expect(threeScore).toBeGreaterThan(
      oneScore
    )

    expect(
      threeScore - oneScore
    ).toBeLessThan(40)
  })

  it("starts with modest confidence for a new user", () => {
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

    for (const preference of preferences) {
      expect(preference.confidence).toBeLessThan(0.5)
      expect(preference.confidence).toBeGreaterThan(0)
    }
  })
})
