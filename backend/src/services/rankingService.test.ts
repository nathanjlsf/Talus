import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Trail } from "../repositories/trailRepository.js"

vi.mock("./trailService.js", () => ({
  loadScopedTrails: vi.fn(),
}))

vi.mock("./preferenceService.js", () => ({
  getUserPreferences: vi.fn(),
}))

import { getUserPreferences } from "./preferenceService.js"
import { calculateRanking } from "./rankingService.js"
import { loadScopedTrails } from "./trailService.js"

const loadScopedTrailsMock = vi.mocked(loadScopedTrails)
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

    expect(loadScopedTrailsMock).toHaveBeenCalledWith(7, {
      county: "Marin",
      limit: null,
    })
    expect(ranking.map((item) => item.trail.name)).toEqual([
      "Zion Overlook",
      "Alpine Loop",
    ])
    expect(ranking[0]?.rank).toBe(1)
    expect(ranking[0]?.score).toBeGreaterThan(
      ranking[1]?.score ?? 0
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
})
