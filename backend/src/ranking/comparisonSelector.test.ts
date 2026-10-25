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
      park_name: null,
      park_type: null,
      park_source: null,
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
      forest_score : null,
      water_score: 0.2,
      coastal_score: null,
      created_at: "",
    },
    {
      id: 2,
      name: "Hard Trail",
      location: "Bay Area",
      park_name: null,
      park_type: null,
      park_source: null,
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
      forest_score: null,
      water_score: 0.7,
      coastal_score: null,
      created_at: "",
    },
    {
      id: 3,
      name: "Moderate Trail",
      location: "Bay Area",
      park_name: null,
      park_type: null,
      park_source: null,
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
      forest_score: null,
      water_score: 0.5,
      coastal_score: null,
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
      secondTrailId: 3,
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
        park_name: null,
        park_type: null,
        park_source: null,
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
        forest_score: 0.5,
        water_score: 0.5,
        coastal_score: 0.5,
        created_at: "",
        },
        {
        id: 2,
        name: "Long Hard Trail",
        location: null,
        park_name: null,
        park_type: null,
        park_source: null,
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
        forest_score: 0.5,
        water_score: 0.5,
        coastal_score: 0.5,
        created_at: "",
        },
        {
        id: 3,
        name: "Scenic Trail",
        location: null,
        park_name: null,
        park_type: null,
        park_source: null,
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
        forest_score: 0.5,
        water_score: 0.5,
        coastal_score: 0.5,
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

  it("does not treat gravel as dirt when choosing a pair", () => {
    const base = {
      ...trails[2]!,
      scenic_score: 0.5,
      nature_score: 0.5,
      solitude_score: 0.5,
      forest_score: 0.5,
      water_score: 0.5,
      coastal_score: 0.5,
    }

    const catalog: Trail[] = [
      {
        ...base,
        id: 1,
        name: "Dirt",
        terrain: "Dirt",
      },
      {
        ...base,
        id: 2,
        name: "Gravel",
        terrain: "Gravel",
      },
      {
        ...base,
        id: 3,
        name: "Rocky",
        terrain: "Rocky",
      },
    ]

    const preferences: UserPreference[] = [
      {
        attribute: "terrain",
        score: 50,
        confidence: 0,
      },
      {
        attribute: "scenic",
        score: 80,
        confidence: 1,
      },
    ]

    expect(
      selectComparisonPairs(catalog, 1, [], preferences)
    ).toEqual([
      {
        firstTrailId: 1,
        secondTrailId: 3,
      },
    ])
  })

  it("asks about an uncertain attribute instead of a confident one", () => {
    const base = {
      location: null,
      park_name: null,
      park_type: null,
      park_source: null,
      description: null,
      estimated_time_minutes: 120,
      elevation_gain_feet: 600,
      difficulty: "Moderate",
      difficulty_source: "unknown",
      terrain: "Dirt",
      nature_score: 0.5,
      solitude_score: 0.5,
      forest_score: 0.5,
      water_score: 0.5,
      coastal_score: 0.5,
      created_at: "",
    }

    const catalog: Trail[] = [
      {
        ...base,
        id: 1,
        name: "Short",
        distance_miles: 2,
        scenic_score: 0.5,
      },
      {
        ...base,
        id: 2,
        name: "Long",
        distance_miles: 8,
        scenic_score: 0.5,
      },
      {
        ...base,
        id: 3,
        name: "Scenic",
        distance_miles: 4,
        scenic_score: 1,
      },
    ]

    const scenicKnown: UserPreference[] = [
      {
        attribute: "distance",
        score: 50,
        confidence: 0,
      },
      {
        attribute: "scenic",
        score: 90,
        confidence: 1,
      },
    ]

    expect(
      selectComparisonPairs(catalog, 1, [], scenicKnown)
    ).toEqual([
      {
        firstTrailId: 1,
        secondTrailId: 2,
      },
    ])
  })

  it("keeps the high and low tails of an attribute in a large catalog", () => {
    const many: Trail[] = Array.from(
      { length: 400 },
      (_, index) => ({
        ...trails[0]!,
        id: index + 1,
        name: `Trail ${index + 1}`,
        distance_miles: 4,
        elevation_gain_feet: 600,
        difficulty: "Moderate",
        terrain: "Dirt",
        scenic_score: 0.5,
        nature_score: 0.5,
        solitude_score: 0.5,
        forest_score: 0.5,
        water_score: 0.5,
        coastal_score: null,
      })
    )

    many[249] = {
      ...many[249]!,
      coastal_score: 0,
    }

    many[250] = {
      ...many[250]!,
      coastal_score: 1,
    }

    const pairs = selectComparisonPairs(many, 1)

    expect(pairs[0]).toEqual({
      firstTrailId: 250,
      secondTrailId: 251,
    })
  })

  it("still returns a pair from a large trail catalog", () => {
    const many = Array.from(
      { length: 500 },
      (_, index) => ({
        ...trails[0]!,
        id: index + 1,
        distance_miles: (index % 12) + 1,
        elevation_gain_feet: (index % 8) * 300,
      })
    )

    const pairs = selectComparisonPairs(many, 1)

    expect(pairs).toHaveLength(1)
    expect(pairs[0]!.firstTrailId).not.toBe(
      pairs[0]!.secondTrailId
    )
  })
})
