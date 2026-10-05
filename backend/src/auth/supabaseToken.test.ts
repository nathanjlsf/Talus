import { afterEach, describe, expect, it, vi } from "vitest"

import {
  clearTokenCache,
  supabaseUserIdFromToken,
  tokenFromHeader,
} from "./supabaseToken.js"

describe("tokenFromHeader", () => {
  it("reads a bearer token", () => {
    expect(tokenFromHeader("Bearer abc")).toBe("abc")
  })

  it("rejects a missing or malformed header", () => {
    expect(tokenFromHeader(undefined)).toBeNull()
    expect(tokenFromHeader("abc")).toBeNull()
    expect(tokenFromHeader("Basic abc")).toBeNull()
  })
})

describe("supabaseUserIdFromToken", () => {
  afterEach(() => {
    clearTokenCache()
    vi.unstubAllGlobals()
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_PUBLISHABLE_KEY
  })

  it("uses the Supabase user id from a valid token", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co"
    process.env.SUPABASE_PUBLISHABLE_KEY = "publishable"

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "supabase-user" }),
    })

    vi.stubGlobal("fetch", fetchMock)

    await expect(
      supabaseUserIdFromToken("token-a")
    ).resolves.toBe("supabase-user")

    await expect(
      supabaseUserIdFromToken("token-a")
    ).resolves.toBe("supabase-user")

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("rejects a token Supabase does not accept", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co"
    process.env.SUPABASE_PUBLISHABLE_KEY = "publishable"

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      })
    )

    await expect(
      supabaseUserIdFromToken("token-b")
    ).rejects.toMatchObject({ status: 401 })
  })
})
