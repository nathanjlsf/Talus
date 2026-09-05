import { describe, expect, it } from "vitest"

import { insertTrailIntoRanking } from "./insert.js"
import { getRank, sortRanking } from "./scoring.js"

describe("ranking engine", () => {
  it("creates a ranking with the first trail", () => {
    const ranking = insertTrailIntoRanking([], 1)

    expect(ranking).toEqual([
      {
        trailId: 1,
        score: 1000,
      },
    ])
  })

  it("adds a second trail below the first", () => {
    const ranking = insertTrailIntoRanking([], 1)

    const updated = insertTrailIntoRanking(
        ranking,
        2
    )

    expect(updated).toHaveLength(2)
    expect(updated.map((trail) => trail.trailId)).toEqual([1, 2])
  })

  it("inserts a trail between two existing trails", () => {
    const ranking = [
      {
        trailId: 1,
        score: 1200,
      },
      {
        trailId: 2,
        score: 1000,
      },
    ]

    const updated = insertTrailIntoRanking(
      ranking,
      3,
      1,
      2
    )

    expect(updated.map((trail) => trail.trailId)).toEqual([
      1,
      3,
      2,
    ])
  })

  it("does not insert a duplicate trail", () => {
    const ranking = [
      {
        trailId: 1,
        score: 1000,
      },
    ]

    const updated = insertTrailIntoRanking(
      ranking,
      1
    )

    expect(updated).toEqual(ranking)
  })

  it("sorts rankings by score", () => {
    const ranking = [
      {
        trailId: 1,
        score: 900,
      },
      {
        trailId: 2,
        score: 1200,
      },
      {
        trailId: 3,
        score: 1000,
      },
    ]

    const sorted = sortRanking(ranking)

    expect(sorted.map((trail) => trail.trailId)).toEqual([
      2,
      3,
      1,
    ])
  })

  it("returns a trail's rank", () => {
    const ranking = [
      {
        trailId: 1,
        score: 1200,
      },
      {
        trailId: 2,
        score: 1100,
      },
      {
        trailId: 3,
        score: 1000,
      },
    ]

    expect(getRank(ranking, 1)).toBe(1)
    expect(getRank(ranking, 2)).toBe(2)
    expect(getRank(ranking, 3)).toBe(3)
  })

  it("returns null for an unknown trail", () => {
    const ranking = [
      {
        trailId: 1,
        score: 1000,
      },
    ]

    expect(getRank(ranking, 99)).toBeNull()
  })
})