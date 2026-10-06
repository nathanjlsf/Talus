import { describe, expect, it } from "vitest"

import {
  cellKey,
  isHikingRelation,
  isHikingWay,
  shouldCleanupStaleTrails,
} from "./hikingWays.js"

describe("isHikingWay", () => {
  it("keeps named paths and walkable tracks", () => {
    expect(
      isHikingWay({
        name: "Dipsea Trail",
        highway: "path",
      })
    ).toBe(true)

    expect(
      isHikingWay({
        name: "Coast Walk",
        highway: "footway",
      })
    ).toBe(true)

    expect(
      isHikingWay({
        name: "Fire Road",
        highway: "track",
        foot: "designated",
      })
    ).toBe(true)
  })

  it("drops unnamed ways and tracks that are not for walking", () => {
    expect(
      isHikingWay({
        highway: "path",
      })
    ).toBe(false)

    expect(
      isHikingWay({
        name: "Service Track",
        highway: "track",
      })
    ).toBe(false)
  })
})

describe("isHikingRelation", () => {
  it("keeps hiking and foot routes", () => {
    expect(
      isHikingRelation({
        type: "route",
        route: "hiking",
      })
    ).toBe(true)

    expect(
      isHikingRelation({
        type: "route",
        route: "bicycle",
      })
    ).toBe(false)
  })
})

describe("cellKey", () => {
  it("groups nearby points into the same half-degree cell", () => {
    expect(cellKey(37.1, -122.4)).toBe(
      cellKey(37.4, -122.1)
    )

    expect(cellKey(37.1, -122.4)).not.toBe(
      cellKey(37.6, -122.4)
    )
  })
})

describe("shouldCleanupStaleTrails", () => {
  it("waits until every cell has been imported", () => {
    expect(shouldCleanupStaleTrails(0, 0)).toBe(false)
    expect(shouldCleanupStaleTrails(12, 11)).toBe(false)
    expect(shouldCleanupStaleTrails(12, 12)).toBe(true)
  })
})
