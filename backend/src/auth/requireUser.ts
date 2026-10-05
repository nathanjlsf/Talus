import type { NextFunction, Request, Response } from "express"

import { findUserBySupabaseId } from "../services/userService.js"
import {
  AuthError,
  supabaseUserIdFromToken,
  tokenFromHeader,
} from "./supabaseToken.js"

function reject(
  res: Response,
  error: unknown
) {
  if (res.headersSent) {
    return
  }

  const status = error instanceof AuthError ? error.status : 401

  res.status(status).json({
    error: "Sign in required",
  })
}

export async function readSupabaseUserId(
  header: string | undefined
): Promise<string> {
  const token = tokenFromHeader(header)

  if (!token) {
    throw new AuthError(401, "Sign in required")
  }

  return supabaseUserIdFromToken(token)
}

export async function requireSupabaseUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    res.locals.supabaseUserId = await readSupabaseUserId(
      req.header("authorization")
    )
  } catch (error) {
    reject(res, error)
    return
  }

  next()
}

export async function requireTalusUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const supabaseUserId = await readSupabaseUserId(
      req.header("authorization")
    )
    const user = findUserBySupabaseId(supabaseUserId)

    if (!user) {
      res.status(401).json({
        error: "Sign in required",
      })
      return
    }

    res.locals.supabaseUserId = supabaseUserId
    res.locals.talusUserId = user.id
  } catch (error) {
    reject(res, error)
    return
  }

  next()
}

export function talusUserId(res: Response): number {
  const userId = res.locals.talusUserId

  if (typeof userId !== "number") {
    throw new AuthError(401, "Sign in required")
  }

  return userId
}
