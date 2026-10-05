const CACHE_MS = 60_000

const cache = new Map<
  string,
  { supabaseUserId: string; expiresAt: number }
>()

export class AuthError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function tokenFromHeader(
  header: string | undefined
): string | null {
  if (!header) {
    return null
  }

  const [scheme, token] = header.split(" ")

  if (scheme !== "Bearer" || !token) {
    return null
  }

  return token
}

function supabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "")
  const apiKey = process.env.SUPABASE_PUBLISHABLE_KEY

  if (!url || !apiKey) {
    throw new AuthError(401, "Sign in required")
  }

  return { url, apiKey }
}

export function clearTokenCache() {
  cache.clear()
}

export async function supabaseUserIdFromToken(
  token: string
): Promise<string> {
  const cached = cache.get(token)

  if (cached && cached.expiresAt > Date.now()) {
    return cached.supabaseUserId
  }

  const { url, apiKey } = supabaseConfig()

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: apiKey,
    },
  })

  if (!response.ok) {
    throw new AuthError(401, "Sign in required")
  }

  const body = (await response.json()) as {
    id?: unknown
  }

  if (typeof body.id !== "string" || !body.id) {
    throw new AuthError(401, "Sign in required")
  }

  cache.set(token, {
    supabaseUserId: body.id,
    expiresAt: Date.now() + CACHE_MS,
  })

  return body.id
}
