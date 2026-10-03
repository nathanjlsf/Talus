import { describe, expect, it } from "vitest"

import {
  filterOverlappingGroups,
} from "./filterOverlappingGroups.js"

function makeGroup(
  name: string,
  wayIds: number[]
) {
  return {
    name,
    ways: wayIds.map((id) => ({
      type: "way" as const,
      id,
      geometry: [
        { lat: 37, lon: -122 },
        { lat: 37.001, lon: -122.001 },
      ],
    })),
    normalizedWays: [],
    distance_miles: wayIds.length,
    relation_ids: [],
  }
}

describe("filterOverlappingGroups", () => {
  it("removes a smaller same-name group when it is a strict subset", () => {
    const smaller = makeGroup(
      "Dipsea Trail",
      [1, 2]
    )

    const larger = makeGroup(
      "Dipsea Trail",
      [1, 2, 3]
    )

    const result =
      filterOverlappingGroups([
        smaller,
        larger,
      ])

    expect(result).toEqual([
      larger,
    ])
  })

  it("keeps same-name groups that do not overlap by source IDs", () => {
    const first = makeGroup(
      "Dipsea Trail",
      [1, 2]
    )

    const second = makeGroup(
      "Dipsea Trail",
      [3, 4]
    )

    const result =
      filterOverlappingGroups([
        first,
        second,
      ])

    expect(result).toEqual([
      first,
      second,
    ])
  })

  it("does not remove groups with different names", () => {
    const first = makeGroup(
      "Dipsea Trail",
      [1, 2]
    )

    const second = makeGroup(
      "Ocean Trail",
      [1, 2, 3]
    )

    const result =
      filterOverlappingGroups([
        first,
        second,
      ])

    expect(result).toEqual([
      first,
      second,
    ])
  })
})
