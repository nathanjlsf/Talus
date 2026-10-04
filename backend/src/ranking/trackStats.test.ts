import { describe, expect, it } from "vitest"

import {
  didTurnAround,
  findLongStops,
  mileSplits,
  movingSeconds,
  progressAlongTrail,
  summarizeTrack,
  trackDistanceMiles,
  type TrackPoint,
} from "./trackStats.js"

function point(
  minutes: number,
  latitude: number,
  longitude: number,
  accuracy: number | null = 5,
  moment: TrackPoint["moment"] = null
): TrackPoint {
  return {
    recordedAt: new Date(
      Date.UTC(2026, 5, 6, 15, minutes, 0)
    ).toISOString(),
    latitude,
    longitude,
    accuracy,
    moment,
  }
}

describe("trackDistanceMiles", () => {
  it("drops low-accuracy points and GPS jumps", () => {
    const miles = trackDistanceMiles([
      point(0, 37.8, -122.45),
      point(1, 37.801, -122.45, 80),
      point(2, 37.802, -122.45),
      point(3, 38.2, -122.45),
    ])

    expect(miles).toBeGreaterThan(0.1)
    expect(miles).toBeLessThan(0.2)
  })
})

describe("movingSeconds", () => {
  it("ignores time spent standing still", () => {
    const seconds = movingSeconds([
      point(0, 37.8, -122.45),
      point(10, 37.8, -122.45),
      point(12, 37.804, -122.45),
    ])

    expect(seconds).toBeGreaterThan(60)
    expect(seconds).toBeLessThan(180)
  })
})

describe("mileSplits", () => {
  it("records a split once a mile is covered", () => {
    const points: TrackPoint[] = []

    for (let minute = 0; minute <= 20; minute++) {
      points.push(
        point(minute, 37.8 + minute * 0.002, -122.45)
      )
    }

    const splits = mileSplits(points)

    expect(splits.length).toBeGreaterThan(0)
    expect(splits[0]?.mile).toBe(1)
    expect(splits[0]?.seconds).toBeGreaterThan(0)
  })
})

describe("findLongStops", () => {
  it("keeps a stop only when it lasts at least three minutes", () => {
    const stops = findLongStops([
      point(0, 37.8, -122.45),
      point(2, 37.8001, -122.45),
      point(5, 37.8001, -122.4501),
      point(6, 37.81, -122.45),
    ])

    expect(stops).toHaveLength(1)
    expect(stops[0]?.durationSeconds).toBeGreaterThanOrEqual(
      180
    )
  })
})

describe("progressAlongTrail", () => {
  it("measures how far along the trail the track reached", () => {
    const line = [
      { latitude: 37.8, longitude: -122.5 },
      { latitude: 37.8, longitude: -122.48 },
      { latitude: 37.8, longitude: -122.46 },
    ]

    const progress = progressAlongTrail(
      [
        { latitude: 37.8, longitude: -122.5 },
        { latitude: 37.8, longitude: -122.48 },
      ],
      [line]
    )

    expect(progress?.maxFraction).toBeCloseTo(0.5, 1)
    expect(progress?.endFraction).toBeCloseTo(0.5, 1)
  })
})

describe("didTurnAround", () => {
  it("treats a finished out-and-back as complete", () => {
    expect(
      didTurnAround(
        { maxFraction: 0.96, endFraction: 0.05 },
        4,
        4
      )
    ).toBe(false)
  })

  it("treats an early return as a turnaround", () => {
    expect(
      didTurnAround(
        { maxFraction: 0.4, endFraction: 0.05 },
        2,
        5
      )
    ).toBe(true)
  })
})

describe("summarizeTrack", () => {
  it("counts moment marks and a short hike", () => {
    const summary = summarizeTrack({
      points: [
        point(0, 37.8, -122.5, 5, "view"),
        point(5, 37.8, -122.49),
        point(10, 37.8, -122.48, 5, "climb"),
      ],
      startedAt: point(0, 37.8, -122.5).recordedAt,
      endedAt: point(10, 37.8, -122.48).recordedAt,
      trailDistanceMiles: 8,
      trailLines: [
        [
          { latitude: 37.8, longitude: -122.5 },
          { latitude: 37.8, longitude: -122.46 },
        ],
      ],
    })

    expect(summary.moments.view).toBe(1)
    expect(summary.moments.climb).toBe(1)
    expect(summary.distanceMiles).toBeGreaterThan(1)
    expect(summary.turnedAround).toBe(true)
    expect(summary.durationSeconds).toBe(600)
  })
})
