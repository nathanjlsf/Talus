import { describe, expect, it } from "vitest"

import {
  calculateExperienceSignal,
} from "./experienceSignal.js"

describe("calculateExperienceSignal", () => {
  const trail = {
    id: 1,
    distance_miles: 6,
    elevation_gain_feet: 1200,
    difficulty: "Hard",
    terrain: "Rocky",
    scenic_score: 0.9,
    nature_score: 0.8,
    solitude_score: 0.7,
  }

  function createExperience(
    overall_rating: number
  ) {
    return {
      id: 1,
      activity_id: 1,
      overall_rating,
      scenic_rating: null,
      difficulty_rating: null,
      solitude_rating: null,
      notes: null,
      created_at: "",
      trail,
    }
  }

  it("produces positive signals from a highly rated hike", () => {
    const result =
      calculateExperienceSignal([
        createExperience(5),
      ])

    expect(
      result.signal.distance
    ).toBeGreaterThan(0)

    expect(
      result.signal.elevation
    ).toBeGreaterThan(0)

    expect(
      result.signal.difficulty
    ).toBeGreaterThan(0)

    expect(
      result.signal.terrain
    ).toBeGreaterThan(0)

    expect(
      result.signal.scenic
    ).toBeGreaterThan(0)

    expect(
      result.signal.nature
    ).toBeGreaterThan(0)

    expect(
      result.signal.solitude
    ).toBeGreaterThan(0)
  })

  it("produces negative signals from a poorly rated hike", () => {
    const result =
      calculateExperienceSignal([
        createExperience(1),
      ])

    expect(
      result.signal.distance
    ).toBeLessThan(0)

    expect(
      result.signal.elevation
    ).toBeLessThan(0)

    expect(
      result.signal.difficulty
    ).toBeLessThan(0)

    expect(
      result.signal.terrain
    ).toBeLessThan(0)

    expect(
      result.signal.scenic
    ).toBeLessThan(0)

    expect(
      result.signal.nature
    ).toBeLessThan(0)

    expect(
      result.signal.solitude
    ).toBeLessThan(0)
  })

  it("produces a neutral signal from a neutral rating", () => {
    const result =
      calculateExperienceSignal([
        createExperience(3),
      ])

    for (const attribute of [
      "distance",
      "elevation",
      "difficulty",
      "terrain",
      "scenic",
      "nature",
      "solitude",
    ] as const) {
      expect(
        result.signal[attribute]
      ).toBe(0)
    }
  })

  it("tracks evidence for all seven attributes", () => {
    const result =
      calculateExperienceSignal([
        createExperience(5),
      ])

    for (const attribute of [
      "distance",
      "elevation",
      "difficulty",
      "terrain",
      "scenic",
      "nature",
      "solitude",
    ] as const) {
      expect(
        result.evidence[attribute]
      ).toBe(1)
    }
  })
})
