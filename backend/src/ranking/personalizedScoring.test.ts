import { describe, expect, it } from "vitest"

import {
  calculatePersonalizedScore,
} from "./personalizedScoring.js"

describe("calculatePersonalizedScore", () => {
  it("scores a trail highly when it matches strong preferences", () => {
    const score =
      calculatePersonalizedScore(
        {
          distance_miles: 6,
          elevation_gain_feet: 1200,
          difficulty: "Hard",
          terrain: "Rocky",
          scenic_score: 0.9,
          nature_score: 0.9,
          solitude_score: 0.7,
        },
        [
          {
            attribute: "scenic",
            score: 90,
            confidence: 1,
          },
          {
            attribute: "nature",
            score: 90,
            confidence: 1,
          },
        ]
      )

    expect(score).toBeGreaterThan(50)
  })

  it("scores a trail lower when it conflicts with preferences", () => {
    const score =
      calculatePersonalizedScore(
        {
          distance_miles: 3,
          elevation_gain_feet: 400,
          difficulty: "Easy",
          terrain: "Paved",
          scenic_score: 0.2,
          nature_score: 0.2,
          solitude_score: 0.4,
        },
        [
          {
            attribute: "scenic",
            score: 90,
            confidence: 1,
          },
          {
            attribute: "nature",
            score: 90,
            confidence: 1,
          },
        ]
      )

    expect(score).toBeLessThan(50)
  })

  it("returns a neutral score when there is no evidence", () => {
    const score =
      calculatePersonalizedScore(
        {
          distance_miles: 6,
          elevation_gain_feet: 1200,
          difficulty: "Hard",
          terrain: "Rocky",
          scenic_score: 0.9,
          nature_score: 0.8,
          solitude_score: 0.8,
        },
        []
      )

    expect(score).toBe(50)
  })

  it("returns a neutral score for neutral preferences", () => {
    const score =
      calculatePersonalizedScore(
        {
          distance_miles: 6,
          elevation_gain_feet: 1200,
          difficulty: "Hard",
          terrain: "Rocky",
          scenic_score: 0.9,
          nature_score: 0.8,
          solitude_score: 0.8,
        },
        [
          {
            attribute: "scenic",
            score: 50,
            confidence: 1,
          },
          {
            attribute: "nature",
            score: 50,
            confidence: 1,
          },
        ]
      )

    expect(score).toBe(50)
  })

    it("scores higher when a trail matches a preference for more distance and elevation", () => {
    const score =
      calculatePersonalizedScore(
        {
          distance_miles: 8,
          elevation_gain_feet: 1800,
          difficulty: "Hard",
          terrain: "Rocky",
          scenic_score: 0.5,
          nature_score: 0.5,
          solitude_score: 0.5,
        },
        [
          {
            attribute: "distance",
            score: 90,
            confidence: 1,
          },
          {
            attribute: "elevation",
            score: 90,
            confidence: 1,
          },
        ]
      )

    expect(score).toBeGreaterThan(50)
  })

  it("scores higher when a trail matches a preference for less distance and elevation", () => {
    const score =
      calculatePersonalizedScore(
        {
          distance_miles: 2,
          elevation_gain_feet: 200,
          difficulty: "Easy",
          terrain: "Paved",
          scenic_score: 0.5,
          nature_score: 0.5,
          solitude_score: 0.5,
        },
        [
          {
            attribute: "distance",
            score: 10,
            confidence: 1,
          },
          {
            attribute: "elevation",
            score: 10,
            confidence: 1,
          },
        ]
      )

    expect(score).toBeGreaterThan(50)
  })

    it("scores higher when difficulty matches a preference for harder trails", () => {
    const score =
      calculatePersonalizedScore(
        {
          distance_miles: 5,
          elevation_gain_feet: 1000,
          difficulty: "Hard",
          terrain: "Dirt",
          scenic_score: 0.5,
          nature_score: 0.5,
          solitude_score: 0.5,
        },
        [
          {
            attribute: "difficulty",
            score: 90,
            confidence: 1,
          },
        ]
      )

    expect(score).toBeGreaterThan(50)
  })

  it("scores higher when terrain matches a preference for more challenging terrain", () => {
    const score =
      calculatePersonalizedScore(
        {
          distance_miles: 5,
          elevation_gain_feet: 1000,
          difficulty: "Moderate",
          terrain: "Rocky",
          scenic_score: 0.5,
          nature_score: 0.5,
          solitude_score: 0.5,
        },
        [
          {
            attribute: "terrain",
            score: 90,
            confidence: 1,
          },
        ]
      )

    expect(score).toBeGreaterThan(50)
  })
})
