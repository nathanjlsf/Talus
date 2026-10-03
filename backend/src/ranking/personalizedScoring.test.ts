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
          forest_score: null,
          water_score: null,
          coastal_score: null,
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
          forest_score: null,
          water_score: null,
          coastal_score: null,
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
          forest_score: null,
          water_score: null,
          coastal_score: null,
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
          forest_score: null,
          water_score: null,
          coastal_score: null,
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
          forest_score: null,
          water_score: null,
          coastal_score: null,
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
          forest_score: null,
          water_score: null,
          coastal_score: null,
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
          forest_score: null,
          water_score: null,
          coastal_score: null,
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
          forest_score: null,
          water_score: null,
          coastal_score: null,
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

  it("uses forest, water, and coastal preferences", () => {
    const trail = {
      distance_miles: 5,
      elevation_gain_feet: 500,
      difficulty: "Moderate",
      terrain: "Dirt",
      scenic_score: 0.5,
      nature_score: 0.5,
      solitude_score: 0.5,
      forest_score: 0.9,
      water_score: 0.2,
      coastal_score: 0.1,
    }

    const forestPreference = [
      {
        attribute: "forest" as const,
        score: 90,
        confidence: 1,
      },
    ]

    const waterPreference = [
      {
        attribute: "water" as const,
        score: 90,
        confidence: 1,
      },
    ]

    const coastalPreference = [
      {
        attribute: "coastal" as const,
        score: 90,
        confidence: 1,
      },
    ]

    const forestScore =
      calculatePersonalizedScore(
        trail,
        forestPreference
      )

    const waterScore =
      calculatePersonalizedScore(
        trail,
        waterPreference
      )

    const coastalScore =
      calculatePersonalizedScore(
        trail,
        coastalPreference
      )

    expect(forestScore).toBeGreaterThan(50)
    expect(waterScore).toBeLessThan(50)
    expect(coastalScore).toBeLessThan(50)
  })

  describe("with a learned sweet spot", () => {
    const baseTrail = {
      elevation_gain_feet: 1000,
      difficulty: "Moderate",
      terrain: "Dirt",
      scenic_score: 0.5,
      nature_score: 0.5,
      solitude_score: 0.5,
      forest_score: null,
      water_score: null,
      coastal_score: null,
    }

    const sweetSpot = [
      {
        attribute: "distance" as const,
        score: 80,
        confidence: 0.8,
        target: 0.6,
        tolerance: 0.1,
      },
    ]

    it("ranks a trail in the sweet spot above longer and shorter trails", () => {
      const inside = calculatePersonalizedScore(
        { ...baseTrail, distance_miles: 6 },
        sweetSpot
      )

      const longer = calculatePersonalizedScore(
        { ...baseTrail, distance_miles: 10 },
        sweetSpot
      )

      const shorter = calculatePersonalizedScore(
        { ...baseTrail, distance_miles: 2 },
        sweetSpot
      )

      expect(inside).toBeGreaterThan(longer)
      expect(inside).toBeGreaterThan(shorter)
      expect(longer).toBeLessThan(50)
    })

    it("no longer rewards the longest trail just for being long", () => {
      const sixMiles = calculatePersonalizedScore(
        { ...baseTrail, distance_miles: 6 },
        sweetSpot
      )

      const tenMiles = calculatePersonalizedScore(
        { ...baseTrail, distance_miles: 10 },
        sweetSpot
      )

      expect(sixMiles).toBeGreaterThan(tenMiles)
    })

    it("keeps more-is-better for scenery alongside a sweet spot", () => {
      const preferences = [
        ...sweetSpot,
        {
          attribute: "scenic" as const,
          score: 90,
          confidence: 0.8,
        },
      ]

      const scenic = calculatePersonalizedScore(
        {
          ...baseTrail,
          distance_miles: 6,
          scenic_score: 0.95,
        },
        preferences
      )

      const plain = calculatePersonalizedScore(
        {
          ...baseTrail,
          distance_miles: 6,
          scenic_score: 0.2,
        },
        preferences
      )

      expect(scenic).toBeGreaterThan(plain)
    })
  })

  describe("with missing trail attributes", () => {
    const preferences = [
      { attribute: "scenic" as const, score: 90, confidence: 0.8 },
      { attribute: "nature" as const, score: 90, confidence: 0.8 },
      { attribute: "solitude" as const, score: 90, confidence: 0.8 },
      { attribute: "water" as const, score: 90, confidence: 0.8 },
    ]

    const wellTagged = {
      distance_miles: 5,
      elevation_gain_feet: 1000,
      difficulty: "Moderate",
      terrain: "Dirt",
      scenic_score: 0.85,
      nature_score: 0.85,
      solitude_score: 0.85,
      water_score: 0.85,
    }

    const thinlyTagged = {
      distance_miles: 5,
      elevation_gain_feet: 0,
      elevation_status: "pending",
      difficulty: "Unknown",
      terrain: null,
      scenic_score: 1,
      nature_score: null,
      solitude_score: null,
      water_score: null,
    }

    it("keeps a thinly tagged trail below a well-tagged good match", () => {
      const wellTaggedScore =
        calculatePersonalizedScore(
          wellTagged,
          preferences
        )

      const thinlyTaggedScore =
        calculatePersonalizedScore(
          thinlyTagged,
          preferences
        )

      expect(wellTaggedScore).toBeGreaterThan(
        thinlyTaggedScore
      )
    })

    it("pulls a one-attribute match toward neutral", () => {
      const score = calculatePersonalizedScore(
        thinlyTagged,
        preferences
      )

      expect(score).toBeGreaterThan(50)
      expect(score).toBeLessThan(65)
    })

    it("ignores pending zero elevation instead of treating it as flat", () => {
      const flatLover = [
        {
          attribute: "elevation" as const,
          score: 50,
          confidence: 0.8,
          target: 0.05,
          tolerance: 0.1,
        },
      ]

      expect(
        calculatePersonalizedScore(
          thinlyTagged,
          flatLover
        )
      ).toBe(50)
    })
  })
})
