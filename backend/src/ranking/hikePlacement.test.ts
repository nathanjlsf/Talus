import { describe, expect, it } from "vitest"

import {
  nextPlacementWindow,
  placementOpponentIndex,
  rankHikes,
} from "./hikePlacement.js"

describe("rankHikes", () => {
  it("orders past hikes by comparison wins", () => {
    const ranked = rankHikes(
      [
        { trailId: 1, latestAt: "2026-01-01" },
        { trailId: 2, latestAt: "2026-02-01" },
        { trailId: 3, latestAt: "2026-03-01" },
      ],
      [
        { winnerTrailId: 2, loserTrailId: 1 },
        { winnerTrailId: 2, loserTrailId: 3 },
      ]
    )

    expect(ranked[0]).toBe(2)
  })
})

describe("placement search", () => {
  it("asks about the middle hike, then narrows", () => {
    const first = placementOpponentIndex(0, 4)

    expect(first).toBe(2)

    const afterWin = nextPlacementWindow(0, 4, 2, true)
    const afterLoss = nextPlacementWindow(0, 4, 2, false)

    expect(afterWin).toEqual({ low: 0, high: 1 })
    expect(afterLoss).toEqual({ low: 3, high: 4 })
    expect(
      placementOpponentIndex(afterWin.low, afterWin.high)
    ).toBe(0)
  })

  it("stops when the window is empty", () => {
    expect(placementOpponentIndex(3, 2)).toBeNull()
  })
})
