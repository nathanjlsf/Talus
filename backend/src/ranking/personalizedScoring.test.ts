import { describe, expect, it } from "vitest"

import {
  calculatePersonalizedScore,
} from "./personalizedScoring.js"

describe("calculatePersonalizedScore", () => {
  it("scores a trail highly when it matches strong preferences", () => {
    const score =
      calculatePersonalizedScore(
        {
          scenic_score: 0.9,
          forest_score: 0.3,
          coastal_score: 0.9,
          solitude_score: 0.7,
        },
        [
          {
            attribute: "scenic",
            score: 90,
            confidence: 1,
          },
          {
            attribute: "coastal",
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
          scenic_score: 0.2,
          forest_score: 0.3,
          coastal_score: 0.2,
          solitude_score: 0.4,
        },
        [
          {
            attribute: "scenic",
            score: 90,
            confidence: 1,
          },
          {
            attribute: "coastal",
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
          scenic_score: 0.9,
          forest_score: 0.8,
          coastal_score: 0.9,
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
          scenic_score: 0.9,
          forest_score: 0.8,
          coastal_score: 0.9,
          solitude_score: 0.8,
        },
        [
          {
            attribute: "scenic",
            score: 50,
            confidence: 1,
          },
          {
            attribute: "coastal",
            score: 50,
            confidence: 1,
          },
        ]
      )

    expect(score).toBe(50)
  })
})