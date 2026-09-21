import { describe, expect, it } from "vitest"

import {
  isImportCandidate,
} from "./filterTrails.js"

import type { TrailGroup } from "./groupTrails.js"

function makeGroup(
  tags: Record<string, string>,
  distance = 1
): TrailGroup {
  return {
    name: "Test Trail",
    ways: [
      {
        type: "way",
        id: 1,
        tags,
        geometry: [
          { lat: 37.7, lon: -122.4 },
          { lat: 37.71, lon: -122.41 },
        ],
      },
    ],
    normalizedWays: [],
    distance_miles: distance,
    relation_ids: [],
  }
}

describe("isImportCandidate", () => {
  it("accepts a normal hiking path", () => {
    const group = makeGroup({
      highway: "path",
      foot: "yes",
    })

    expect(
      isImportCandidate(group)
    ).toBe(true)
  })

  it("rejects restricted access", () => {
    const group = makeGroup({
      highway: "path",
      access: "private",
    })

    expect(
      isImportCandidate(group)
    ).toBe(false)
  })

  it("rejects non-pedestrian infrastructure", () => {
    const group = makeGroup({
      highway: "cycleway",
    })

    expect(
      isImportCandidate(group)
    ).toBe(false)
  })

  it("accepts a walkable track", () => {
    const group = makeGroup({
      highway: "track",
      foot: "yes",
    })

    expect(
      isImportCandidate(group)
    ).toBe(true)
  })

  it("rejects a track without hiking access signals", () => {
    const group = makeGroup({
      highway: "track",
    })

    expect(
      isImportCandidate(group)
    ).toBe(false)
  })

  it("rejects extremely short ways", () => {
    const group = makeGroup(
      {
        highway: "path",
        foot: "yes",
      },
      0.05
    )

    expect(
      isImportCandidate(group)
    ).toBe(false)
  })

    it("rejects obvious non-trail names", () => {
    const group = {
      ...makeGroup({
        highway: "path",
        foot: "yes",
      }),
      name: "7-Eleven",
    }

    expect(
      isImportCandidate(group)
    ).toBe(false)
  })

  it("rejects obvious non-trail signage", () => {
    const group = {
      ...makeGroup({
        highway: "path",
        foot: "yes",
      }),
      name: "Do Not Enter: Not a Trail",
    }

    expect(
      isImportCandidate(group)
    ).toBe(false)
  })

    it("rejects paths with MTB-specific difficulty tags", () => {
    const group = makeGroup({
      highway: "path",
      foot: "yes",
      "mtb:scale": "4",
      "mtb:scale:imba": "3",
    })

    expect(
      isImportCandidate(group)
    ).toBe(false)
  })

  it("rejects downhill MTB paths", () => {
    const group = {
      ...makeGroup({
        highway: "path",
        bicycle: "yes",
        foot: "yes",
      }),
      name: "4H DH",
    }

    expect(
      isImportCandidate(group)
    ).toBe(false)
  })

    it("rejects service roads", () => {
    const group = makeGroup({
      highway: "service",
      foot: "yes",
    })

    expect(
      isImportCandidate(group)
    ).toBe(false)
  })

  it("rejects construction paths", () => {
    const group = makeGroup({
      highway: "path",
      foot: "yes",
      construction: "yes",
    })

    expect(
      isImportCandidate(group)
    ).toBe(false)
  })

  it("rejects very short paths with bad trail visibility", () => {
    const group = makeGroup(
      {
        highway: "path",
        name: "Down to Railway",
        trail_visibility: "bad",
      },
      0.12
    )

    expect(
      isImportCandidate(group)
    ).toBe(false)
  })
})
