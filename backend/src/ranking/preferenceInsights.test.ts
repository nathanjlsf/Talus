import { describe, expect, it } from "vitest"

import {
  generatePreferenceInsights,
} from "./preferenceInsights.js"

describe("generatePreferenceInsights", () => {
  it("identifies a strong preference", () => {
    const insights =
      generatePreferenceInsights([
        {
          attribute: "scenic",
          score: 80,
          confidence: 1,
        },
      ])

    expect(insights[0]!.direction).toBe("high")

    expect(insights[0]!.message).toBe(
      "You tend to prefer scenic views."
    )
  })

  it("identifies a weak preference", () => {
    const insights =
      generatePreferenceInsights([
        {
          attribute: "nature",
          score: 20,
          confidence: 1,
        },
      ])

    expect(insights[0]!.direction).toBe("low")
  })

  it("does not overstate weak evidence", () => {
    const insights =
      generatePreferenceInsights([
        {
          attribute: "scenic",
          score: 80,
          confidence: 0.2,
        },
      ])

    expect(insights[0]!.direction).toBe(
      "neutral"
    )

    expect(
      insights[0]!.message
    ).toContain("still learning")
  })
})
