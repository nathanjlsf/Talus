import { describe, expect, it } from "vitest"

import {
  calculatePairInformation,
} from "./comparisonInformation.js"

import type { Trail } from "../repositories/trailRepository.js"
import type { UserPreference } from "./preferenceTypes.js"

function createTrail(
  overrides: Partial<Trail> = {}
): Trail {
  return {
    id: 1,
    name: "Trail A",
    location: "California",
    park_name: null,
    park_type: null,
    park_source: null,
    description: null,
    difficulty_source: "unknown",
    distance_miles: 5,
    estimated_time_minutes: 120,
    elevation_gain_feet: 1000,
    difficulty: "Moderate",
    terrain: "Dirt",
    scenic_score: 0.5,
    nature_score: 0.5,
    solitude_score: 0.5,
    forest_score: 0.5,
    water_score: 0.5,
    coastal_score: 0.5,
    created_at: "2026-01-01",
    ...overrides,
  }
}

function createPreferences(
  overrides: Partial<UserPreference> = {}
): UserPreference[] {
  return [
    {
      attribute: "distance",
      score: 50,
      confidence: 0,
      ...overrides,
    },
  ]
}

describe("calculatePairInformation", () => {
  it("returns zero for identical trails", () => {
    const first = createTrail()

    const second = createTrail({
      id: 2,
    })

    const preferences =
      createPreferences({
        confidence: 0,
      })

    expect(
      calculatePairInformation(
        first,
        second,
        preferences
      )
    ).toBe(0)
  })

  it("returns higher information when uncertainty is higher", () => {
    const first = createTrail({
      distance_miles: 2,
    })

    const second = createTrail({
      id: 2,
      distance_miles: 8,
    })

    const uncertain =
      createPreferences({
        confidence: 0.1,
      })

    const confident =
      createPreferences({
        confidence: 0.9,
      })

    const uncertainInformation =
      calculatePairInformation(
        first,
        second,
        uncertain
      )

    const confidentInformation =
      calculatePairInformation(
        first,
        second,
        confident
      )

    expect(
      uncertainInformation
    ).toBeGreaterThan(
      confidentInformation
    )
  })

  it("returns higher information for larger attribute differences", () => {
    const first = createTrail({
      distance_miles: 2,
    })

    const smallDifference =
      createTrail({
        id: 2,
        distance_miles: 3,
      })

    const largeDifference =
      createTrail({
        id: 3,
        distance_miles: 9,
      })

    const preferences =
      createPreferences({
        confidence: 0,
      })

    const smallInformation =
      calculatePairInformation(
        first,
        smallDifference,
        preferences
      )

    const largeInformation =
      calculatePairInformation(
        first,
        largeDifference,
        preferences
      )

    expect(
      largeInformation
    ).toBeGreaterThan(
      smallInformation
    )
  })

  it("accumulates information across attributes", () => {
    const first = createTrail({
      distance_miles: 2,
      elevation_gain_feet: 200,
    })

    const second =
      createTrail({
        id: 2,
        distance_miles: 8,
        elevation_gain_feet: 1800,
      })

    const preferences: UserPreference[] = [
      {
        attribute: "distance",
        score: 50,
        confidence: 0,
      },
      {
        attribute: "elevation",
        score: 50,
        confidence: 0,
      },
    ]

    const distanceOnly =
      calculatePairInformation(
        first,
        second,
        [preferences[0]!]
      )

    const bothAttributes =
      calculatePairInformation(
        first,
        second,
        preferences
      )

    expect(
      bothAttributes
    ).toBeGreaterThan(
      distanceOnly
    )
  })

  it("includes forest when both trails are tagged", () => {
    const first = createTrail({
      forest_score: 0.1,
    })

    const second = createTrail({
      id: 2,
      forest_score: 0.9,
    })

    const information = calculatePairInformation(
      first,
      second,
      [
        {
          attribute: "forest",
          score: 50,
          confidence: 0,
        },
      ]
    )

    expect(information).toBeCloseTo(0.8)
  })

  it("prefers a pair that straddles a sweet spot", () => {
    const short = createTrail({
      id: 1,
      distance_miles: 2,
    })

    const long = createTrail({
      id: 2,
      distance_miles: 8,
    })

    const longer = createTrail({
      id: 3,
      distance_miles: 9,
    })

    const preferences: UserPreference[] = [
      {
        attribute: "distance",
        score: 50,
        confidence: 0,
        target: 0.2,
        tolerance: 0.1,
      },
    ]

    const straddle = calculatePairInformation(
      short,
      long,
      preferences
    )

    const sameSide = calculatePairInformation(
      long,
      longer,
      preferences
    )

    expect(straddle).toBeGreaterThan(sameSide)
  })

  it("treats gravel as closer to dirt than to rocky", () => {
    const dirt = createTrail({
      id: 1,
      terrain: "Dirt",
    })

    const gravel = createTrail({
      id: 2,
      terrain: "Gravel",
    })

    const rocky = createTrail({
      id: 3,
      terrain: "Rocky",
    })

    const preferences: UserPreference[] = [
      {
        attribute: "terrain",
        score: 50,
        confidence: 0,
      },
    ]

    const gravelToDirt = calculatePairInformation(
      gravel,
      dirt,
      preferences
    )

    const dirtToRocky = calculatePairInformation(
      dirt,
      rocky,
      preferences
    )

    expect(gravelToDirt).toBeCloseTo(0.1)
    expect(dirtToRocky).toBeGreaterThan(gravelToDirt)
  })

  it("returns zero when confidence is complete", () => {
    const first = createTrail({
      distance_miles: 1,
    })

    const second =
      createTrail({
        id: 2,
        distance_miles: 10,
      })

    const preferences =
      createPreferences({
        confidence: 1,
      })

    expect(
      calculatePairInformation(
        first,
        second,
        preferences
      )
    ).toBe(0)
  })
})
