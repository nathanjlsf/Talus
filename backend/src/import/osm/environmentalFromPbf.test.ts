import {
  describe,
  expect,
  it,
} from "vitest"

import {
  cellsOverlappingBounds,
  isEnvironmentalTags,
} from "./environmentalFromPbf.js"

describe("isEnvironmentalTags", () => {
  it("accepts forest, water, and coastal tags", () => {
    expect(
      isEnvironmentalTags({
        natural: "wood",
      })
    ).toBe(true)

    expect(
      isEnvironmentalTags({
        landuse: "forest",
      })
    ).toBe(true)

    expect(
      isEnvironmentalTags({
        waterway: "stream",
      })
    ).toBe(true)

    expect(
      isEnvironmentalTags({
        natural: "coastline",
      })
    ).toBe(true)
  })

  it("rejects unrelated tags", () => {
    expect(
      isEnvironmentalTags({
        highway: "path",
      })
    ).toBe(false)

    expect(
      isEnvironmentalTags(undefined)
    ).toBe(false)
  })
})

describe("cellsOverlappingBounds", () => {
  it("includes the cell that contains the feature", () => {
    const cells = cellsOverlappingBounds({
      minLat: 37.25,
      maxLat: 37.25,
      minLon: -122.2,
      maxLon: -122.2,
    })

    expect(cells).toContain("74:-245")
  })
})
