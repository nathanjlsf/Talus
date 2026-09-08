import { describe, expect, it } from "vitest"

import {
  generateRecommendationExplanations,
} from "./recommendationExplanation.js"

describe("generateRecommendationExplanations", () => {
  it("explains a strong positive match", () => {
    const explanations =
      generateRecommendationExplanations(
        {
          distance_miles: 6,
          elevation_gain_feet: 1200,
          difficulty: "Hard",
          terrain: "Rocky",
          scenic_score: 0.9,
          nature_score: 0.4,
          solitude_score: 0.6,
        },
        [
          {
            attribute: "scenic",
            score: 90,
            confidence: 1,
          },
        ]
      )

    expect(explanations).toHaveLength(1)

    expect(
      explanations[0]!.direction
    ).toBe("positive")

    expect(
      explanations[0]!.message
    ).toContain("scenery")
  })

  it("explains a strong negative match", () => {
    const explanations =
      generateRecommendationExplanations(
        {
          distance_miles: 3,
          elevation_gain_feet: 400,
          difficulty: "Easy",
          terrain: "Paved",
          scenic_score: 0.2,
          nature_score: 0.4,
          solitude_score: 0.6,
        },
        [
          {
            attribute: "scenic",
            score: 90,
            confidence: 1,
          },
        ]
      )

    expect(explanations).toHaveLength(1)

    expect(
      explanations[0]!.direction
    ).toBe("negative")
  })

  it("ignores preferences with low confidence", () => {
    const explanations =
      generateRecommendationExplanations(
        {
          distance_miles: 6,
          elevation_gain_feet: 1200,
          difficulty: "Hard",
          terrain: "Rocky",
          scenic_score: 0.9,
          nature_score: 0.4,
          solitude_score: 0.6,
        },
        [
          {
            attribute: "scenic",
            score: 90,
            confidence: 0.2,
          },
        ]
      )

    expect(explanations).toHaveLength(0)
  })

  it("ignores attributes with little impact", () => {
    const explanations =
      generateRecommendationExplanations(
        {
          distance_miles: 5,
          elevation_gain_feet: 1000,
          difficulty: "Moderate",
          terrain: "Dirt",
          scenic_score: 0.5,
          nature_score: 0.4,
          solitude_score: 0.6,
        },
        [
          {
            attribute: "scenic",
            score: 90,
            confidence: 1,
          },
        ]
      )

    expect(explanations).toHaveLength(0)
  })
})
