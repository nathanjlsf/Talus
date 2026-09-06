import { describe, expect, it } from "vitest"

import {
  generateRecommendationExplanations,
} from "./recommendationExplanation.js"

describe("generateRecommendationExplanations", () => {
  it("explains a strong positive match", () => {
    const explanations =
      generateRecommendationExplanations(
        {
          scenic_score: 9,
          forest_score: 4,
          coastal_score: 9,
          solitude_score: 6,
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
    expect(explanations[0]!.direction).toBe(
      "positive"
    )
    expect(explanations[0]!.message).toContain(
      "scenic views"
    )
  })

  it("explains a strong negative match", () => {
    const explanations =
      generateRecommendationExplanations(
        {
          scenic_score: 0.2,
          forest_score: 0.4,
          coastal_score: 0.2,
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
    expect(explanations[0]!.direction).toBe(
      "negative"
    )
  })

  it("ignores preferences with low confidence", () => {
    const explanations =
      generateRecommendationExplanations(
        {
          scenic_score: 9,
          forest_score: 4,
          coastal_score: 9,
          solitude_score: 6,
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
          scenic_score: 0.5,
          forest_score: 0.4,
          coastal_score: 0.5,
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