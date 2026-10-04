import { describe, expect, it } from "vitest"

import {
  calculateTrackSignal,
  describeTrack,
  effortEnjoyment,
  trackSweetSpotRating,
  type RecordedHike,
} from "./trackSignal.js"

function hike(
  overrides: Partial<RecordedHike> = {}
): RecordedHike {
  return {
    trail: {
      distance_miles: 8,
      elevation_gain_feet: 1800,
      difficulty: "Hard",
      terrain: "Rocky",
      scenic_score: 0.9,
      nature_score: 0.8,
      solitude_score: 0.4,
      water_score: 0.7,
    },
    completionFraction: 1,
    turnedAround: false,
    paceRatio: 0.8,
    longStopCount: 0,
    viewMoments: 0,
    climbMoments: 0,
    restMoments: 0,
    ...overrides,
  }
}

describe("effortEnjoyment", () => {
  it("rewards a comfortable finish and penalizes a turnaround", () => {
    expect(effortEnjoyment(hike())).toBeGreaterThan(0.5)
    expect(
      effortEnjoyment(
        hike({
          turnedAround: true,
          completionFraction: 0.4,
        })
      )
    ).toBeLessThan(0)
  })
})

describe("calculateTrackSignal", () => {
  it("pulls scenic preference up when a view is marked", () => {
    const result = calculateTrackSignal([
      hike({ viewMoments: 1, longStopCount: 1 }),
    ])

    expect(result.evidence.scenic).toBe(1)
    expect(result.signal.scenic).toBeGreaterThan(0)
    expect(result.signal.distance).toBeGreaterThan(0)
  })

  it("pulls distance preference down after an early turnaround", () => {
    const result = calculateTrackSignal([
      hike({
        turnedAround: true,
        completionFraction: 0.35,
      }),
    ])

    expect(result.signal.distance).toBeLessThan(0)
    expect(result.evidence.scenic).toBe(0)
  })
})

describe("trackSweetSpotRating", () => {
  it("likes a comfortable hike and dislikes a turnaround", () => {
    expect(trackSweetSpotRating(hike())).toBe(5)
    expect(
      trackSweetSpotRating(
        hike({
          turnedAround: true,
          completionFraction: 0.3,
        })
      )
    ).toBe(2)
  })
})

describe("describeTrack", () => {
  it("leads with what the track showed", () => {
    const messages = describeTrack({
      completionFraction: 0.42,
      turnedAround: true,
      paceRatio: 1.5,
      longStopCount: 1,
      viewMoments: 1,
      climbMoments: 0,
      restMoments: 0,
      hadPoints: true,
    })

    expect(messages[0]).toContain("turned around")
    expect(messages.some((message) => message.includes("view"))).toBe(
      true
    )
  })
})
