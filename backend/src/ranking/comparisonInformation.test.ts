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
    description: null,
    distance_miles: 5,
    estimated_time_minutes: 120,
    elevation_gain_feet: 1000,
    difficulty: "Moderate",
    terrain: "Dirt",
    scenic_score: 0.5,
    nature_score: 0.5,
    solitude_score: 0.5,
    water_score: 0.5,
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
