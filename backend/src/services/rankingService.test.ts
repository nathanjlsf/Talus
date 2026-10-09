import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Trail } from "../repositories/trailRepository.js"

vi.mock("./trailService.js", () => ({
  loadScopedTrails: vi.fn(),
  findTrailsByIds: vi.fn(),
}))

vi.mock("./preferenceService.js", () => ({
  getUserPreferences: vi.fn(),
}))

import { getUserPreferences } from "./preferenceService.js"
import { calculateRanking } from "./rankingService.js"
import {
  findTrailsByIds,
  loadScopedTrails,
} from "./trailService.js"

const loadScopedTrailsMock = vi.mocked(loadScopedTrails)
const findTrailsByIdsMock = vi.mocked(findTrailsByIds)
const getUserPreferencesMock = vi.mocked(getUserPreferences)

function trail(
  id: number,
  name: string,
  scenicScore: number
): Trail {
  return {
    id,
    name,
    location: "California",
    park_name: null,
    park_type: null,
    park_source: null,
    description: null,
    distance_miles: 5,
    estimated_time_minutes: 120,
    elevation_gain_feet: 800,
    difficulty: "Moderate",
    difficulty_source: "estimated",
    terrain: "Dirt",
    scenic_score: scenicScore,
    nature_score: scenicScore,
    solitude_score: 0.5,
    forest_score: null,
    water_score: null,
    coastal_score: null,
    created_at: "2026-01-01",
  }
}

describe("calculateRanking", () => {
  beforeEach(() => {
    loadScopedTrailsMock.mockReset()
    findTrailsByIdsMock.mockReset()
    getUserPreferencesMock.mockReset()
    getUserPreferencesMock.mockReturnValue([
      {
        attribute: "scenic",
        score: 90,
        confidence: 1,
      },
      {
        attribute: "nature",
        score: 90,
        confidence: 1,
      },
    ])
  })

  it("ranks every trail in scope, not the alphabetical page", () => {
    loadScopedTrailsMock.mockReturnValue([
      trail(1, "Alpine Loop", 0.1),
      trail(2, "Zion Overlook", 0.95),
    ])

    const ranking = calculateRanking(7, { county: "Marin" })

    expect(loadScopedTrailsMock).toHaveBeenCalledWith(
      7,
      {
        county: "Marin",
        limit: null,
      },
      { fallbackToLatestCounty: false }
    )
    expect(ranking.map((item) => item.trail.name)).toEqual([
      "Zion Overlook",
      "Alpine Loop",
    ])
    expect(ranking[0]?.rank).toBe(1)
    expect(ranking[0]?.score).toBeGreaterThan(
      ranking[1]?.score ?? 0
    )
  })

  it("does not limit recommendations to the latest hike county", () => {
    loadScopedTrailsMock.mockReturnValue([
      trail(3, "Upper Yosemite Falls Trail", 0.8),
    ])

    calculateRanking(7, {})

    expect(loadScopedTrailsMock).toHaveBeenCalledWith(
      7,
      { limit: null },
      { fallbackToLatestCounty: false }
    )
  })

  it("applies a result limit after scoring", () => {
    loadScopedTrailsMock.mockReturnValue([
      trail(1, "Alpine Loop", 0.1),
      trail(2, "Zion Overlook", 0.95),
    ])

    const ranking = calculateRanking(7, { limit: 1 })

    expect(ranking).toHaveLength(1)
    expect(ranking[0]?.trail.name).toBe("Zion Overlook")
  })

  it("scores the requested trails even when they are outside the home county", () => {
    findTrailsByIdsMock.mockReturnValue([
      trail(9, "Imported Ridge", 0.2),
    ])

    const ranking = calculateRanking(7, {
      trailIds: [9],
    })

    expect(loadScopedTrailsMock).not.toHaveBeenCalled()
    expect(findTrailsByIdsMock).toHaveBeenCalledWith([9])
    expect(ranking).toHaveLength(1)
    expect(ranking[0]?.trail.name).toBe("Imported Ridge")
    expect(ranking[0]?.score).toEqual(expect.any(Number))
  })
})
