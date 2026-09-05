import type { RankedTrail } from "./types.js"

export function sortRanking(
  ranking: RankedTrail[]
): RankedTrail[] {
  return [...ranking].sort(
    (a, b) => b.score - a.score
  )
}

export function getRank(
  ranking: RankedTrail[],
  trailId: number
): number | null {
  const index = ranking.findIndex(
    (trail) => trail.trailId === trailId
  )

  if (index === -1) {
    return null
  }

  return index + 1
}