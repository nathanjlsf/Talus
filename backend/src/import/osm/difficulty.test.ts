import {
  describe,
  expect,
  it,
} from "vitest"

import {
  difficultyFromSacScale,
} from "./difficulty.js"

describe(
  "difficultyFromSacScale",
  () => {
    it("maps hiking to Easy", () => {
      expect(
        difficultyFromSacScale("hiking")
      ).toBe("Easy")
    })

    it("maps mountain hiking to Moderate", () => {
      expect(
        difficultyFromSacScale(
          "mountain_hiking"
        )
      ).toBe("Moderate")
    })

    it("maps demanding mountain hiking to Hard", () => {
      expect(
        difficultyFromSacScale(
          "demanding_mountain_hiking"
        )
      ).toBe("Hard")
    })

    it("maps alpine scales to Hard", () => {
      expect(
        difficultyFromSacScale(
          "alpine_hiking"
        )
      ).toBe("Hard")

      expect(
        difficultyFromSacScale(
          "demanding_alpine_hiking"
        )
      ).toBe("Hard")

      expect(
        difficultyFromSacScale(
          "difficult_alpine_hiking"
        )
      ).toBe("Hard")
    })

    it("returns null when sac_scale is missing", () => {
      expect(
        difficultyFromSacScale(undefined)
      ).toBeNull()
    })

    it("returns null for an unknown value", () => {
      expect(
        difficultyFromSacScale(
          "something_unknown"
        )
      ).toBeNull()
    })
  }
)
