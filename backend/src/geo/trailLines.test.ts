import { describe, expect, it } from "vitest"

import {
  boundsFromPoints,
  groupPointsByWay,
  parseBbox,
  simplifyPath,
} from "./trailLines.js"

describe("groupPointsByWay", () => {
  it("keeps each way in its own line when sequence restarts", () => {
    const lines = groupPointsByWay([
      { way_id: 2, latitude: 1, longitude: 1 },
      { way_id: 2, latitude: 2, longitude: 1 },
      { way_id: 7, latitude: 9, longitude: 9 },
      { way_id: 7, latitude: 9, longitude: 10 },
    ])

    expect(lines).toHaveLength(2)
    expect(lines[0]!.map((point) => point.latitude)).toEqual([
      1, 2,
    ])
    expect(lines[1]!.map((point) => point.longitude)).toEqual([
      9, 10,
    ])
  })
})

describe("simplifyPath", () => {
  it("keeps endpoints and drops points on a straight run", () => {
    const simplified = simplifyPath(
      [
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 0.00001 },
        { latitude: 0, longitude: 1 },
      ],
      0.001
    )

    expect(simplified).toEqual([
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
    ])
  })

  it("keeps a point that changes direction", () => {
    const simplified = simplifyPath(
      [
        { latitude: 0, longitude: 0 },
        { latitude: 1, longitude: 0 },
        { latitude: 1, longitude: 1 },
      ],
      0.001
    )

    expect(simplified).toHaveLength(3)
  })
})

describe("boundsFromPoints", () => {
  it("returns the enclosing box", () => {
    expect(
      boundsFromPoints([
        { latitude: 37.1, longitude: -122.5 },
        { latitude: 37.8, longitude: -122.1 },
      ])
    ).toEqual({
      minLatitude: 37.1,
      maxLatitude: 37.8,
      minLongitude: -122.5,
      maxLongitude: -122.1,
    })
  })
})

describe("parseBbox", () => {
  it("parses west,south,east,north", () => {
    expect(
      parseBbox("-122.6,37.2,-122.1,37.9")
    ).toEqual({
      minLongitude: -122.6,
      minLatitude: 37.2,
      maxLongitude: -122.1,
      maxLatitude: 37.9,
    })
  })

  it("rejects a box that is inside out", () => {
    expect(parseBbox("10,10,0,0")).toBeNull()
  })
})
