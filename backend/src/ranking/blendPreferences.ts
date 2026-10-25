import type {
  ExperienceSignal,
} from "./experienceSignal.js"

import type {
  PreferenceWithEvidence,
  UserPreference,
} from "./preferenceTypes.js"

import type {
  TrackSignal,
} from "./trackSignal.js"

function strength(evidence: number): number {
  return (
    1 -
    Math.exp(-evidence / 4)
  )
}

export function blendPreferenceScores(
  pairwise: PreferenceWithEvidence[],
  experience: ExperienceSignal,
  track: TrackSignal
): UserPreference[] {
  return pairwise.map((preference) => {
    const attribute = preference.attribute

    const pairwiseEvidence =
      preference.evidence

    const experienceEvidence =
      experience.evidence[attribute] ?? 0

    const trackEvidence =
      track.evidence[attribute] ?? 0

    if (
      pairwiseEvidence === 0 &&
      experienceEvidence === 0 &&
      trackEvidence === 0
    ) {
      return {
        attribute,
        score: preference.score,
        confidence: preference.confidence,
      }
    }

    const experienceScore =
      50 +
      (experience.signal[attribute] ?? 0) * 50

    const trackScore =
      50 +
      (track.signal[attribute] ?? 0) * 50

    const pairwiseStrength =
      strength(pairwiseEvidence)

    const experienceStrength =
      strength(experienceEvidence)

    const trackStrength =
      strength(trackEvidence)

    const totalStrength =
      pairwiseStrength +
      experienceStrength +
      trackStrength

    if (totalStrength === 0) {
      return {
        attribute,
        score: preference.score,
        confidence: preference.confidence,
      }
    }

    const combinedScore =
      (
        preference.score *
          pairwiseStrength +
        experienceScore *
          experienceStrength +
        trackScore *
          trackStrength
      ) / totalStrength

    const combinedConfidence =
      Math.min(
        0.9,
        1 -
          Math.exp(
            -(
              pairwiseEvidence +
              experienceEvidence +
              trackEvidence
            ) / 5
          )
      )

    return {
      attribute,
      score: Math.max(
        10,
        Math.min(90, combinedScore)
      ),
      confidence: Number(
        combinedConfidence.toFixed(2)
      ),
    }
  })
}
