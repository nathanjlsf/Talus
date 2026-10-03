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

  it("describes distance as a sweet spot instead of more or less", () => {
    const insights =
      generatePreferenceInsights([
        {
          attribute: "distance",
          score: 80,
          confidence: 0.7,
          target: 0.6,
          tolerance: 0.1,
        },
      ])

    expect(insights[0]!.direction).toBe("range")
    expect(insights[0]!.message).toBe(
      "You enjoy hikes around 5 to 7 miles."
    )
  })

  it("describes elevation and difficulty sweet spots", () => {
    const insights =
      generatePreferenceInsights([
        {
          attribute: "elevation",
          score: 50,
          confidence: 0.7,
          target: 0.55,
          tolerance: 0.15,
        },
        {
          attribute: "difficulty",
          score: 50,
          confidence: 0.7,
          target: 0.5,
          tolerance: 0.25,
        },
      ])

    expect(insights[0]!.message).toBe(
      "You enjoy around 800 to 1,400 ft of climbing."
    )

    expect(insights[1]!.message).toBe(
      "You usually go for moderate trails."
    )
  })
})
