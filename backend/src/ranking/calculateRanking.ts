import type { Comparison, RankedTrail } from "./types.js"

export function calculatePairwiseRanking(
  comparisons: Comparison[]
): RankedTrail[] {
  const trailIds = new Set<number>()

  for (const comparison of comparisons) {
    trailIds.add(comparison.winnerTrailId)
    trailIds.add(comparison.loserTrailId)
  }

  const scores = new Map<number, number>()

  for (const trailId of trailIds) {
    scores.set(trailId, 0)
  }

  for (const comparison of comparisons) {
    const winnerScore = scores.get(
      comparison.winnerTrailId
    )

    const loserScore = scores.get(
      comparison.loserTrailId
    )

    if (winnerScore === undefined || loserScore === undefined) {
      continue
    }

    scores.set(
      comparison.winnerTrailId,
      winnerScore + 1
    )

    scores.set(
      comparison.loserTrailId,
      loserScore
    )
  }

  return Array.from(scores.entries())
    .map(([trailId, score]) => ({
      trailId,
      score,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score
      }

      return a.trailId - b.trailId
    })
}