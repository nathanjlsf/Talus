import { describe, expect, it } from "vitest"

import {
  diversifyRanked,
} from "./diversity.js"

import type {
  DiversifiableTrail,
} from "./diversity.js"

function trail(
  name: string,
  overrides: Partial<DiversifiableTrail> = {}
): DiversifiableTrail {
  return {
    name,
    location: "Marin",
    park_name: "Redwood Park",
    distance_miles: 5,
    elevation_gain_feet: 800,
    difficulty: "Moderate",
    terrain: "Dirt",
    scenic_score: 0.8,
    nature_score: 0.8,
    solitude_score: 0.5,
    forest_score: 0.5,
    water_score: 0.5,
    coastal_score: 0.5,
    ...overrides,
  }
}

describe("diversifyRanked", () => {
  it("puts a different trail ahead of a same-name duplicate", () => {
    const ranked = [
      {
        trail: trail("Coastal Loop"),
        score: 90,
      },
      {
        trail: trail("Coastal Loop"),
        score: 88,
      },
      {
        trail: trail("Ridge Line", {
          park_name: "Ridge Park",
          location: "Sonoma",
        }),
        score: 70,
      },
    ]

    const diversified = diversifyRanked(ranked)

    expect(
      diversified.map((item) => item.trail.name)
    ).toEqual([
      "Coastal Loop",
      "Ridge Line",
      "Coastal Loop",
    ])

    expect(diversified).toHaveLength(3)
  })

  it("defers a trail whose bounds and attributes match a higher one", () => {
    const bounds = {
      min_latitude: 37.8,
      max_latitude: 37.81,
      min_longitude: -122.5,
      max_longitude: -122.49,
    }

    const ranked = [
      {
        trail: trail("North", {
          ...bounds,
          park_name: null,
          location: null,
        }),
        score: 90,
      },
      {
        trail: trail("South", {
          ...bounds,
          park_name: null,
          location: null,
        }),
        score: 89,
      },
      {
        trail: trail("Far", {
          park_name: null,
          location: null,
          min_latitude: 38.2,
          max_latitude: 38.21,
          min_longitude: -123,
          max_longitude: -122.99,
          distance_miles: 1,
          scenic_score: 0.1,
        }),
        score: 60,
      },
    ]

    expect(
      diversifyRanked(ranked).map(
        (item) => item.trail.name
      )
    ).toEqual(["North", "Far", "South"])
  })
})
