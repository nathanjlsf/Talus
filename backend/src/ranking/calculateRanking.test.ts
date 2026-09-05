import { describe, expect, it } from "vitest"

import {
  calculatePairwiseRanking,
} from "./calculateRanking.js"

describe("calculatePairwiseRanking", () => {
  it("ranks a winner above a loser", () => {
    const ranking = calculatePairwiseRanking([
      {
        winnerTrailId: 1,
        loserTrailId: 2,
      },
    ])

    expect(ranking).toEqual([
      {
        trailId: 1,
        score: 1,
      },
      {
        trailId: 2,
        score: 0,
      },
    ])
  })

  it("ranks trails based on total wins", () => {
    const ranking = calculatePairwiseRanking([
      {
        winnerTrailId: 1,
        loserTrailId: 2,
      },
      {
        winnerTrailId: 1,
        loserTrailId: 3,
      },
      {
        winnerTrailId: 2,
        loserTrailId: 3,
      },
    ])

    expect(ranking).toEqual([
      {
        trailId: 1,
        score: 2,
      },
      {
        trailId: 2,
        score: 1,
      },
      {
        trailId: 3,
        score: 0,
      },
    ])
  })

  it("handles contradictory comparisons without crashing", () => {
    const ranking = calculatePairwiseRanking([
      {
        winnerTrailId: 1,
        loserTrailId: 2,
      },
      {
        winnerTrailId: 2,
        loserTrailId: 3,
      },
      {
        winnerTrailId: 3,
        loserTrailId: 1,
      },
    ])

    expect(ranking).toHaveLength(3)
  })

  it("handles repeated comparisons", () => {
    const ranking = calculatePairwiseRanking([
      {
        winnerTrailId: 1,
        loserTrailId: 2,
      },
      {
        winnerTrailId: 1,
        loserTrailId: 2,
      },
      {
        winnerTrailId: 1,
        loserTrailId: 2,
      },
    ])

    expect(ranking).toEqual([
      {
        trailId: 1,
        score: 3,
      },
      {
        trailId: 2,
        score: 0,
      },
    ])
  })

  it("returns an empty ranking with no comparisons", () => {
    const ranking = calculatePairwiseRanking([])

    expect(ranking).toEqual([])
  })
})