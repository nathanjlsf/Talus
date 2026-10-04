export interface HikedTrail {
  trailId: number
  latestAt: string
}

export interface PlacementComparison {
  winnerTrailId: number
  loserTrailId: number
}

export function rankHikes(
  hikes: HikedTrail[],
  comparisons: PlacementComparison[]
): number[] {
  const scores = new Map(
    hikes.map((hike) => [hike.trailId, 0])
  )

  for (const comparison of comparisons) {
    const winner = scores.get(
      comparison.winnerTrailId
    )
    const loser = scores.get(
      comparison.loserTrailId
    )

    if (winner === undefined || loser === undefined) {
      continue
    }

    scores.set(
      comparison.winnerTrailId,
      winner + 1
    )
    scores.set(
      comparison.loserTrailId,
      loser - 1
    )
  }

  return [...hikes]
    .sort((left, right) => {
      const scoreDelta =
        scores.get(right.trailId)! -
        scores.get(left.trailId)!

      if (scoreDelta !== 0) {
        return scoreDelta
      }

      return right.latestAt.localeCompare(
        left.latestAt
      )
    })
    .map((hike) => hike.trailId)
}

export function placementOpponentIndex(
  low: number,
  high: number
): number | null {
  if (low > high) {
    return null
  }

  return Math.floor((low + high) / 2)
}

export function nextPlacementWindow(
  low: number,
  high: number,
  opponentIndex: number,
  newHikeWon: boolean
): { low: number; high: number } {
  if (newHikeWon) {
    return {
      low,
      high: opponentIndex - 1,
    }
  }

  return {
    low: opponentIndex + 1,
    high,
  }
}
