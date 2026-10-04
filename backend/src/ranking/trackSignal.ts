import {
  getAttributeValue,
  LEARNED_ATTRIBUTES,
} from "./trailAttributes.js"

import type { TrailAttributes } from "./trailAttributes.js"
import type { PreferenceAttribute } from "./preferenceTypes.js"

export interface RecordedHike {
  trail: TrailAttributes
  completionFraction: number
  turnedAround: boolean
  paceRatio: number | null
  longStopCount: number
  viewMoments: number
  climbMoments: number
  restMoments: number
}

export interface TrackSignal {
  signal: Record<PreferenceAttribute, number>
  evidence: Record<PreferenceAttribute, number>
}

function emptyScores(): Record<PreferenceAttribute, number> {
  return {
    distance: 0,
    elevation: 0,
    difficulty: 0,
    terrain: 0,
    scenic: 0,
    nature: 0,
    solitude: 0,
    forest: 0,
    water: 0,
    coastal: 0,
  }
}

export function effortEnjoyment(
  hike: RecordedHike
): number {
  if (
    hike.turnedAround ||
    hike.completionFraction < 0.7
  ) {
    return -0.8
  }

  if (
    hike.paceRatio !== null &&
    hike.paceRatio > 1.35
  ) {
    return 0.15
  }

  if (hike.completionFraction >= 0.85) {
    return hike.paceRatio !== null &&
      hike.paceRatio < 0.9
      ? 0.9
      : 0.6
  }

  return 0.2
}

function elevationEnjoyment(
  hike: RecordedHike,
  effort: number
): number {
  if (hike.climbMoments > 0 && hike.turnedAround) {
    return Math.min(effort, -0.9)
  }

  if (hike.climbMoments > 0 && effort > 0) {
    return Math.min(1, effort + 0.2)
  }

  return effort
}

function sceneryEnjoyment(hike: RecordedHike): number {
  const marks =
    hike.viewMoments +
    Math.min(hike.longStopCount, 2)

  if (marks === 0) {
    return 0
  }

  return Math.min(1, 0.45 + marks * 0.2)
}

function enjoymentFor(
  hike: RecordedHike,
  attribute: PreferenceAttribute
): number {
  const effort = effortEnjoyment(hike)
  const scenery = sceneryEnjoyment(hike)

  switch (attribute) {
    case "distance":
    case "difficulty":
    case "terrain":
      return effort

    case "elevation":
      return elevationEnjoyment(hike, effort)

    case "scenic":
    case "nature":
    case "forest":
    case "coastal":
      return scenery

    case "water":
      return hike.longStopCount > 0 ||
        hike.viewMoments > 0
        ? scenery
        : 0

    case "solitude":
      return hike.restMoments > 0 ? 0.35 : 0

    default:
      return 0
  }
}

export function calculateTrackSignal(
  hikes: RecordedHike[]
): TrackSignal {
  const totals = emptyScores()
  const evidence = emptyScores()

  for (const hike of hikes) {
    for (const attribute of LEARNED_ATTRIBUTES) {
      const trailValue = getAttributeValue(
        hike.trail,
        attribute
      )
      const enjoyment = enjoymentFor(
        hike,
        attribute
      )

      if (trailValue === null || enjoyment === 0) {
        continue
      }

      const trailSignal = (trailValue - 0.5) / 0.5

      totals[attribute] += trailSignal * enjoyment
      evidence[attribute] += 1
    }
  }

  const signal = emptyScores()

  for (const attribute of LEARNED_ATTRIBUTES) {
    if (evidence[attribute] > 0) {
      signal[attribute] =
        totals[attribute] / evidence[attribute]
    }
  }

  return { signal, evidence }
}

export function trackSweetSpotRating(
  hike: RecordedHike
): number | null {
  const effort = effortEnjoyment(hike)

  if (effort >= 0.5) {
    return 5
  }

  if (effort <= -0.5) {
    return 2
  }

  return null
}

export function paceRatioFor(
  paceSecondsPerMile: number | null,
  estimatedTimeMinutes: number,
  trailDistanceMiles: number
): number | null {
  if (
    paceSecondsPerMile === null ||
    estimatedTimeMinutes <= 0 ||
    trailDistanceMiles <= 0
  ) {
    return null
  }

  const estimatedPace =
    (estimatedTimeMinutes * 60) / trailDistanceMiles

  if (estimatedPace <= 0) {
    return null
  }

  return paceSecondsPerMile / estimatedPace
}

export function describeTrack(input: {
  completionFraction: number | null
  turnedAround: boolean
  paceRatio: number | null
  longStopCount: number
  viewMoments: number
  climbMoments: number
  restMoments: number
  hadPoints: boolean
  usablePointCount?: number
}): string[] {
  if (!input.hadPoints) {
    return [
      "Talus didn't get a GPS track, so this hike couldn't teach it about your pace or how far you went.",
    ]
  }

  const messages: string[] = []
  const usableCount =
    input.usablePointCount ?? 1

  if (usableCount === 0) {
    messages.push(
      "The location fixes were too rough to measure distance. Talus kept your moment marks, but not a route."
    )
  }

  if (
    input.turnedAround &&
    input.completionFraction !== null
  ) {
    const percent = Math.round(
      input.completionFraction * 100
    )

    messages.push(
      `You turned around about ${percent}% of the way. Talus will treat hikes of this length as more than you wanted.`
    )
  } else if (
    input.completionFraction !== null &&
    input.completionFraction >= 0.85 &&
    input.paceRatio !== null &&
    input.paceRatio < 0.9
  ) {
    messages.push(
      "You finished faster than the estimate, so this distance felt comfortable."
    )
  } else if (
    input.completionFraction !== null &&
    input.completionFraction >= 0.85 &&
    input.paceRatio !== null &&
    input.paceRatio > 1.35
  ) {
    messages.push(
      "This took longer than the estimate. Talus will treat similar hikes as a harder day for you."
    )
  } else if (
    input.completionFraction !== null &&
    input.completionFraction >= 0.85
  ) {
    messages.push(
      "You finished the trail. Talus will look for more hikes in this range."
    )
  }

  if (input.longStopCount > 0) {
    messages.push(
      input.longStopCount === 1
        ? "You stayed in one place for a while. Talus reads that as a view, a summit, or water you wanted to keep."
        : `You lingered in ${input.longStopCount} places. Talus will treat those kinds of stops as part of what you enjoy.`
    )
  }

  if (input.viewMoments > 0) {
    messages.push(
      "You marked a great view, so scenic trails will count for more."
    )
  }

  if (input.climbMoments > 0) {
    messages.push(
      input.turnedAround
        ? "You marked a tough climb before turning around, so Talus will be careful with this much elevation."
        : "You marked a tough climb, so elevation will weigh more in what Talus suggests."
    )
  }

  if (input.restMoments > 0) {
    messages.push(
      "You marked a rest stop. Talus will remember that this hike asked you to pause."
    )
  }

  if (messages.length === 0) {
    messages.push(
      "Talus saved the track and will use how far you got the next time it recommends a hike."
    )
  }

  return messages
}
