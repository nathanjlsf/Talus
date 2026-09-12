import { describe, expect, it } from "vitest"

import {
  selectComparisonPairs,
} from "./comparisonSelector.js"

import type { Trail } from "../repositories/trailRepository.js"
import type { UserPreference } from "./preferenceTypes.js"

describe("selectComparisonPairs", () => {
  const trails = [
    {
      id: 1,
      name: "Easy Trail",
      location: "Bay Area",
      description: null,
      distance_miles: 2,
      estimated_time_minutes: 60,
      elevation_gain_feet: 200,
      difficulty: "Easy",
      difficulty_source: "unknown",
      terrain: "Paved",
      scenic_score: 0.3,
      nature_score: 0.3,
      solitude_score: 0.3,
      water_score: 0.2,
      created_at: "",
    },
    {
      id: 2,
      name: "Hard Trail",
      location: "Bay Area",
      description: null,
      distance_miles: 8,
      estimated_time_minutes: 240,
      elevation_gain_feet: 1800,
      difficulty: "Hard",
      difficulty_source: "unknown",
      terrain: "Rocky",
      scenic_score: 0.9,
      nature_score: 0.9,
      solitude_score: 0.8,
      water_score: 0.7,
      created_at: "",
    },
    {
      id: 3,
      name: "Moderate Trail",
      location: "Bay Area",
      description: null,
      distance_miles: 4,
      estimated_time_minutes: 100,
      elevation_gain_feet: 600,
      difficulty: "Moderate",
      difficulty_source: "unknown",
      terrain: "Dirt",
      scenic_score: 0.6,
      nature_score: 0.6,
      solitude_score: 0.5,
      water_score: 0.5,
      created_at: "",
    },
  ]

  it("returns the requested number of pairs", () => {
    const pairs =
      selectComparisonPairs(
        trails,
        2
      )

    expect(pairs).toHaveLength(2)
  })

  it("returns the most different pair first", () => {
    const pairs =
      selectComparisonPairs(
        trails,
        1
      )

    expect(pairs[0]).toEqual({
      firstTrailId: 1,
      secondTrailId: 2,
    })
  })

  it("does not compare a trail with itself", () => {
    const pairs =
      selectComparisonPairs(
        trails,
        10
      )

    for (const pair of pairs) {
      expect(
        pair.firstTrailId
      ).not.toBe(
        pair.secondTrailId
      )
    }
  })

  it("does not return duplicate pairs", () => {
    const pairs =
      selectComparisonPairs(
        trails,
        10
      )

    const keys =
      pairs.map(
        (pair) =>
          `${Math.min(
            pair.firstTrailId,
            pair.secondTrailId
          )}:${Math.max(
            pair.firstTrailId,
            pair.secondTrailId
          )}`
      )

    expect(
      new Set(keys).size
    ).toBe(keys.length)
  })

  it("returns all possible pairs when count exceeds available pairs", () => {
    const pairs =
      selectComparisonPairs(
        trails,
        100
      )

    expect(pairs).toHaveLength(3)
  })

  it("returns no pairs for fewer than two trails", () => {
    const pairs =
      selectComparisonPairs(
        [trails[0]!],
        5
      )

    expect(pairs).toHaveLength(0)
  })

  it("excludes previously seen pairs", () => {
    const pairs =
        selectComparisonPairs(
        trails,
        10,
        [
            {
            firstTrailId: 1,
            secondTrailId: 2,
            },
        ]
        )

    for (const pair of pairs) {
        const isSeenPair =
        (
            pair.firstTrailId === 1 &&
            pair.secondTrailId === 2
        ) ||
        (
            pair.firstTrailId === 2 &&
            pair.secondTrailId === 1
        )

        expect(isSeenPair).toBe(false)
    }
  })

  it("uses learned preferences to prioritize informative pairs", () => {
    const trails: Trail[] = [
        {
        id: 1,
        name: "Short Easy Trail",
        location: null,
        description: null,
        distance_miles: 2,
        estimated_time_minutes: 60,
        elevation_gain_feet: 200,
        difficulty: "Easy",
        difficulty_source: "unknown",
        terrain: "Paved",
        scenic_score: 0.5,
        nature_score: 0.5,
        solitude_score: 0.5,
        water_score: 0.5,
        created_at: "",
        },
        {
        id: 2,
        name: "Long Hard Trail",
        location: null,
        description: null,
        distance_miles: 8,
        estimated_time_minutes: 240,
        elevation_gain_feet: 1600,
        difficulty: "Hard",
        difficulty_source: "unknown",
        terrain: "Rocky",
        scenic_score: 0.5,
        nature_score: 0.5,
        solitude_score: 0.5,
        water_score: 0.5,
        created_at: "",
        },
        {
        id: 3,
        name: "Scenic Trail",
        location: null,
        description: null,
        distance_miles: 4,
        estimated_time_minutes: 120,
        elevation_gain_feet: 600,
        difficulty: "Moderate",
        difficulty_source: "unknown",
        terrain: "Dirt",
        scenic_score: 1,
        nature_score: 0.5,
        solitude_score: 0.5,
        water_score: 0.5,
        created_at: "",
        },
    ]

    const preferences: UserPreference[] = [
        {
            attribute: "distance",
            score: 50,
            confidence: 1,
        },
        {
            attribute: "elevation",
            score: 50,
            confidence: 1,
        },
        {
            attribute: "difficulty",
            score: 50,
            confidence: 1,
        },
        {
            attribute: "terrain",
            score: 50,
            confidence: 1,
        },
        {
            attribute: "scenic",
            score: 50,
            confidence: 0,
        },
        {
            attribute: "nature",
            score: 50,
            confidence: 1,
        },
        {
            attribute: "solitude",
            score: 50,
            confidence: 1,
        },
    ]

    const pairs = selectComparisonPairs(
        trails,
        1,
        [],
        preferences
    )

    expect(pairs).toHaveLength(1)
    expect(pairs[0]).toEqual({
        firstTrailId: 1,
        secondTrailId: 3,
    })
  })
})
