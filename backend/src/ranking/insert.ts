import type { RankedTrail } from "./types.js"

export function insertTrailIntoRanking(
  ranking: RankedTrail[],
  trailId: number,
  winnerTrailId?: number,
  loserTrailId?: number
): RankedTrail[] {
  if (ranking.some((trail) => trail.trailId === trailId)) {
    return ranking
  }

  if (ranking.length === 0) {
    return [
      {
        trailId,
        score: 1000,
      },
    ]
  }

  if (
    winnerTrailId === undefined ||
    loserTrailId === undefined
  ) {
    const lastTrail = ranking[ranking.length - 1]

    if (!lastTrail) {
      throw new Error("Ranking unexpectedly empty")
    }

    return [
      ...ranking,
      {
        trailId,
        score: lastTrail.score - 100,
      },
    ]
  }

  const winner = ranking.find(
    (trail) => trail.trailId === winnerTrailId
  )

  const loser = ranking.find(
    (trail) => trail.trailId === loserTrailId
  )

  if (!winner || !loser) {
    throw new Error("Winner or loser not found in ranking")
  }

  const newScore = (winner.score + loser.score) / 2

  return [
    ...ranking,
    {
      trailId,
      score: newScore,
    },
  ].sort((a, b) => b.score - a.score)
}