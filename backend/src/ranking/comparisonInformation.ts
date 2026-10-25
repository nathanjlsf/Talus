import type { Trail } from "../repositories/trailRepository.js"

import type { UserPreference } from "./preferenceTypes.js"

import {
  getTolerance,
  hasPreferredRange,
  rangeFit,
} from "./preferredRange.js"

import {
  getAttributeValue,
} from "./trailAttributes.js"

export function calculatePairInformation(
  first: Trail,
  second: Trail,
  preferences: UserPreference[]
): number {
  let information = 0

  for (const preference of preferences) {
    const firstValue = getAttributeValue(
      first,
      preference.attribute
    )

    const secondValue = getAttributeValue(
      second,
      preference.attribute
    )

    if (
      firstValue === null ||
      secondValue === null
    ) {
      continue
    }

    const difference = hasPreferredRange(preference)
      ? Math.abs(
          rangeFit(
            firstValue,
            preference.target,
            getTolerance(preference)
          ) -
            rangeFit(
              secondValue,
              preference.target,
              getTolerance(preference)
            )
        )
      : Math.abs(firstValue - secondValue)

    const uncertainty =
      1 - preference.confidence

    information += difference * uncertainty
  }

  return information
}
