import { describe, expect, it } from "vitest"

import {
  applyPreferredRanges,
  buildLikedTrails,
  calculatePreferredRanges,
  describePreferredRange,
  rangeFit,
} from "./preferredRange.js"

function trail(
  distance_miles: number,
  elevation_gain_feet: number,
  difficulty = "Moderate"
) {
  return {
    distance_miles,
    elevation_gain_feet,
    difficulty,
    terrain: "Dirt",
    scenic_score: 0.5,
    nature_score: 0.5,
    solitude_score: 0.5,
  }
}

describe("calculatePreferredRanges", () => {
  it("centers the sweet spot on liked trails", () => {
    const ranges = calculatePreferredRanges([
      { trail: trail(5, 800), weight: 1 },
      { trail: trail(7, 1200), weight: 1 },
    ])

    const distance = ranges.find(
      (range) => range.attribute === "distance"
    )

    const elevation = ranges.find(
      (range) => range.attribute === "elevation"
    )

    expect(distance?.target).toBeCloseTo(0.6)
    expect(distance?.tolerance).toBeCloseTo(0.1)
    expect(elevation?.target).toBeCloseTo(0.5)
  })

  it("never narrows below the minimum tolerance", () => {
    const ranges = calculatePreferredRanges([
      { trail: trail(6, 1000), weight: 1 },
      { trail: trail(6, 1000), weight: 1 },
    ])

    for (const range of ranges) {
      expect(range.tolerance).toBeGreaterThan(0)
    }
  })

  it("gains confidence with more liked trails", () => {
    const one = calculatePreferredRanges([
      { trail: trail(6, 1000), weight: 1 },
    ])

    const many = calculatePreferredRanges(
      Array.from({ length: 6 }, () => ({
        trail: trail(6, 1000),
        weight: 1,
      }))
    )

    expect(
      many[0]!.confidence
    ).toBeGreaterThan(one[0]!.confidence)
  })

  it("shifts the sweet spot away from rejected trails", () => {
    const likedOnly = calculatePreferredRanges([
      { trail: trail(6, 1000), weight: 1 },
      { trail: trail(6, 1000), weight: 1 },
    ])

    const withRejections = calculatePreferredRanges([
      { trail: trail(6, 1000), weight: 1 },
      { trail: trail(6, 1000), weight: 1 },
      { trail: trail(10, 2000), weight: -0.35 },
      { trail: trail(10, 2000), weight: -0.35 },
    ])

    const likedDistance = likedOnly.find(
      (range) => range.attribute === "distance"
    )

    const rejectedDistance = withRejections.find(
      (range) => range.attribute === "distance"
    )

    expect(rejectedDistance!.target).toBeLessThan(
      likedDistance!.target
    )
    expect(rejectedDistance!.confidence).toBe(
      likedDistance!.confidence
    )
  })

  it("leaves the sweet spot unchanged when a rejection matches it", () => {
    const ranges = calculatePreferredRanges([
      { trail: trail(6, 1000), weight: 1 },
      { trail: trail(6, 1000), weight: -0.35 },
    ])

    expect(
      ranges.find(
        (range) => range.attribute === "distance"
      )?.target
    ).toBeCloseTo(0.6)
  })

  it("skips attributes without usable evidence", () => {
    const ranges = calculatePreferredRanges([
      {
        trail: trail(6, 1000, "Unknown"),
        weight: 1,
      },
    ])

    expect(
      ranges.some(
        (range) => range.attribute === "difficulty"
      )
    ).toBe(false)
  })
})

describe("buildLikedTrails", () => {
  it("uses comparison winners and highly rated hikes", () => {
    const trails = new Map([
      [1, trail(6, 1000)],
      [2, trail(2, 200)],
    ])

    const liked = buildLikedTrails(
      [{ winnerTrailId: 1, loserTrailId: 2 }],
      trails,
      [
        { trail: trail(8, 1500), rating: 5 },
        { trail: trail(4, 600), rating: 4 },
        { trail: trail(1, 100), rating: 2 },
      ]
    )

    expect(
      liked.map((item) => item.weight)
    ).toEqual([1, -0.35, 1, 0.5, -0.5])

    expect(liked[0]!.trail.distance_miles).toBe(6)
  })
})

describe("rangeFit", () => {
  it("rewards closeness instead of larger values", () => {
    const inside = rangeFit(0.6, 0.6, 0.1)
    const longer = rangeFit(0.9, 0.6, 0.1)
    const shorter = rangeFit(0.3, 0.6, 0.1)

    expect(inside).toBe(1)
    expect(longer).toBeLessThan(0)
    expect(shorter).toBeLessThan(0)
    expect(longer).toBeCloseTo(shorter)
  })
})

describe("applyPreferredRanges", () => {
  it("adds sweet spots only to range attributes", () => {
    const result = applyPreferredRanges(
      [
        { attribute: "distance", score: 70, confidence: 0.3 },
        { attribute: "elevation", score: 60, confidence: 0.3 },
        { attribute: "scenic", score: 80, confidence: 0.5 },
      ],
      [
        {
          attribute: "distance",
          target: 0.6,
          tolerance: 0.1,
          confidence: 0.6,
        },
      ]
    )

    expect(result[0]).toMatchObject({
      target: 0.6,
      tolerance: 0.1,
      confidence: 0.3,
    })

    expect(result[1]).toMatchObject({
      target: null,
      tolerance: null,
    })

    expect(result[2]).toEqual({
      attribute: "scenic",
      score: 80,
      confidence: 0.5,
    })
  })
})

describe("describePreferredRange", () => {
  it("describes distance in miles", () => {
    expect(
      describePreferredRange({
        attribute: "distance",
        score: 50,
        confidence: 0.6,
        target: 0.6,
        tolerance: 0.1,
      })?.label
    ).toBe("5 to 7 miles")
  })

  it("describes elevation in feet", () => {
    expect(
      describePreferredRange({
        attribute: "elevation",
        score: 50,
        confidence: 0.6,
        target: 0.55,
        tolerance: 0.15,
      })?.label
    ).toBe("800 to 1,400 ft")
  })

  it("uses an open range at the top of the scale", () => {
    expect(
      describePreferredRange({
        attribute: "distance",
        score: 50,
        confidence: 0.6,
        target: 0.95,
        tolerance: 0.1,
      })?.label
    ).toBe("8.5+ miles")
  })

  it("names the difficulty levels inside the range", () => {
    const label = (target: number) =>
      describePreferredRange({
        attribute: "difficulty",
        score: 50,
        confidence: 0.6,
        target,
        tolerance: 0.25,
      })?.label

    expect(label(0.5)).toBe("moderate")
    expect(label(0.25)).toBe("easy to moderate")
    expect(label(0.9)).toBe("hard")
  })

  it("returns null without a learned sweet spot", () => {
    expect(
      describePreferredRange({
        attribute: "scenic",
        score: 80,
        confidence: 0.6,
      })
    ).toBeNull()

    expect(
      describePreferredRange({
        attribute: "distance",
        score: 80,
        confidence: 0.6,
        target: null,
      })
    ).toBeNull()
  })
})
