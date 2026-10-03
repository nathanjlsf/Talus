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
          forest_score: 0.7,
          water_score: 0.5,
          coastal_score: 0.3,
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
          forest_score: 0.7,
          water_score: 0.5,
          coastal_score: 0.3,
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
          forest_score: 0.7,
          water_score: 0.5,
          coastal_score: 0.3,
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
          forest_score: 0.7,
          water_score: 0.5,
          coastal_score: 0.3,
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

  it("explains strong environmental matches", () => {
    const trail = {
      distance_miles: 5,
      elevation_gain_feet: 800,
      difficulty: "Moderate",
      terrain: "Dirt",
      scenic_score: 0.5,
      nature_score: 0.5,
      solitude_score: 0.5,
      forest_score: 0.9,
      water_score: 0.8,
      coastal_score: 0.2,
    }

    const preferences = [
      {
        attribute: "forest" as const,
        score: 90,
        confidence: 0.9,
      },
      {
        attribute: "water" as const,
        score: 85,
        confidence: 0.9,
      },
      {
        attribute: "coastal" as const,
        score: 40,
        confidence: 0.9,
      },
    ]

    const explanations =
      generateRecommendationExplanations(
        trail,
        preferences
      )

    expect(
      explanations.some(
        (explanation) =>
          explanation.attribute === "forest" &&
          explanation.direction === "positive"
      )
    ).toBe(true)

    expect(
      explanations.some(
        (explanation) =>
          explanation.attribute === "water" &&
          explanation.direction === "positive"
      )
    ).toBe(true)
  })

  describe("with a learned sweet spot", () => {
    const trail = {
      elevation_gain_feet: 1000,
      difficulty: "Moderate",
      terrain: "Dirt",
      scenic_score: 0.5,
      nature_score: 0.5,
      solitude_score: 0.5,
    }

    const distanceSweetSpot = [
      {
        attribute: "distance" as const,
        score: 70,
        confidence: 0.8,
        target: 0.6,
        tolerance: 0.1,
      },
    ]

    it("says when a trail is in the sweet spot", () => {
      const [explanation] =
        generateRecommendationExplanations(
          { ...trail, distance_miles: 6 },
          distanceSweetSpot
        )

      expect(explanation!.direction).toBe("positive")
      expect(explanation!.message).toBe(
        "At 6 miles, it's in your sweet spot of 5 to 7 miles."
      )
    })

    it("warns when a trail is longer than usual", () => {
      const [explanation] =
        generateRecommendationExplanations(
          { ...trail, distance_miles: 9.5 },
          distanceSweetSpot
        )

      expect(explanation!.direction).toBe("negative")
      expect(explanation!.message).toContain(
        "Longer than you usually enjoy"
      )
    })

    it("warns when a trail is shorter than usual", () => {
      const [explanation] =
        generateRecommendationExplanations(
          { ...trail, distance_miles: 2 },
          distanceSweetSpot
        )

      expect(explanation!.message).toContain(
        "Shorter than you usually enjoy"
      )
    })

    it("warns about harder trails than the hiker usually picks", () => {
      const [explanation] =
        generateRecommendationExplanations(
          { ...trail, distance_miles: 6, difficulty: "Hard" },
          [
            {
              attribute: "difficulty",
              score: 50,
              confidence: 0.8,
              target: 0.1,
              tolerance: 0.25,
            },
          ]
        )

      expect(explanation!.message).toBe(
        "Harder than the easy trails you usually pick."
      )
    })
  })
})
