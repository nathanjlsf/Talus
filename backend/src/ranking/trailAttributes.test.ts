import { describe, expect, it } from "vitest"

import {
  getAttributeValue,
  normalizeTerrain,
} from "./trailAttributes.js"

describe("trailAttributes", () => {
  const trail = {
    distance_miles: 5,
    elevation_gain_feet: 0,
    difficulty: "Moderate",
    terrain: "Gravel",
    scenic_score: 0.8,
    nature_score: null,
    solitude_score: 0.4,
  }

  it("normalizes gravel terrain", () => {
    expect(normalizeTerrain("Gravel")).toBe(0.6)
  })

  it("treats unenriched zero elevation as missing", () => {
    expect(
      getAttributeValue(
        {
          ...trail,
          elevation_status: "pending",
        },
        "elevation"
      )
    ).toBeNull()

    expect(
      getAttributeValue(
        {
          ...trail,
          elevation_status: "complete",
        },
        "elevation"
      )
    ).toBe(0)
  })

  it("keeps elevation when the trail has a real value", () => {
    expect(
      getAttributeValue(
        {
          ...trail,
          elevation_gain_feet: 1000,
          elevation_status: "pending",
        },
        "elevation"
      )
    ).toBe(0.5)
  })

  it("returns null for attributes the trail does not have", () => {
    expect(
      getAttributeValue(trail, "nature")
    ).toBeNull()

    expect(
      getAttributeValue(trail, "forest")
    ).toBeNull()

    expect(
      getAttributeValue(
        {
          ...trail,
          difficulty: "Unknown",
        },
        "difficulty"
      )
    ).toBeNull()
  })
})
