import { describe, expect, it } from "vitest"

import {
  blendPreferenceScores,
} from "./blendPreferences.js"

import type {
  ExperienceSignal,
} from "./experienceSignal.js"

import type {
  PreferenceAttribute,
  PreferenceWithEvidence,
} from "./preferenceTypes.js"

import type {
  TrackSignal,
} from "./trackSignal.js"

const attributes: PreferenceAttribute[] = [
  "distance",
  "elevation",
  "difficulty",
  "terrain",
  "scenic",
  "nature",
  "solitude",
  "forest",
  "water",
  "coastal",
]

function empty(): Record<PreferenceAttribute, number> {
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

function experience(
  signal: Partial<Record<PreferenceAttribute, number>>,
  evidence: Partial<Record<PreferenceAttribute, number>>
): ExperienceSignal {
  return {
    signal: {
      ...empty(),
      ...signal,
    },
    evidence: {
      ...empty(),
      ...evidence,
    },
  }
}

function track(
  signal: Partial<Record<PreferenceAttribute, number>> = {},
  evidence: Partial<Record<PreferenceAttribute, number>> = {}
): TrackSignal {
  return {
    signal: {
      ...empty(),
      ...signal,
    },
    evidence: {
      ...empty(),
      ...evidence,
    },
  }
}

describe("blendPreferenceScores", () => {
  it("does not let unrelated comparisons dilute a rating", () => {
    const pairwise: PreferenceWithEvidence[] =
      attributes.map((attribute) => ({
        attribute,
        score: attribute === "distance" ? 80 : 50,
        confidence: attribute === "distance" ? 0.8 : 0,
        evidence: attribute === "distance" ? 8 : 0,
      }))

    const blended = blendPreferenceScores(
      pairwise,
      experience({ scenic: 1 }, { scenic: 1 }),
      track()
    )

    const scenic = blended.find(
      (preference) => preference.attribute === "scenic"
    )

    const distance = blended.find(
      (preference) =>
        preference.attribute === "distance"
    )

    expect(scenic?.score).toBe(90)
    expect(scenic?.confidence).toBe(0.18)
    expect(distance?.score).toBe(80)
  })
})
