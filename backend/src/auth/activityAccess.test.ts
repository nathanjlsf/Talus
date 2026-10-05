import { describe, expect, it } from "vitest"

import { activityOwnedByUser } from "./activityAccess.js"

describe("activityOwnedByUser", () => {
  it("allows the activity owner", () => {
    expect(
      activityOwnedByUser({ user_id: 4 }, 4)
    ).toBe(true)
  })

  it("hides another person's activity", () => {
    expect(
      activityOwnedByUser({ user_id: 4 }, 9)
    ).toBe(false)
    expect(activityOwnedByUser(undefined, 9)).toBe(false)
  })
})
