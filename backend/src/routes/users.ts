import { Router } from "express"
import {
  findUserBySupabaseId,
  registerUser,
} from "../services/userService.js"
import { requireSupabaseUser } from "../auth/requireUser.js"

const router = Router()

router.use(requireSupabaseUser)

router.get("/:supabaseUserId", (_req, res) => {
  const supabaseUserId = String(res.locals.supabaseUserId ?? "")

  const user = findUserBySupabaseId(supabaseUserId)

  if (!user) {
    res.status(404).json({ error: "User not found" })
    return
  }

  res.json(user)
})

router.post("/", (req, res) => {
  const name = String(req.body.name ?? "").trim()

  if (!name) {
    res.status(400).json({ error: "Name is required" })
    return
  }

  const supabaseUserId = String(res.locals.supabaseUserId ?? "")

  const user = registerUser(name, supabaseUserId)
  res.status(201).json(user)
})

export default router
