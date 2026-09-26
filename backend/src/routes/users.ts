import { Router } from "express"
import {
  findUserBySupabaseId,
  registerUser,
} from "../services/userService.js"

const router = Router()

router.get("/:supabaseUserId", (req, res) => {
  const supabaseUserId = req.params.supabaseUserId

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

  const supabaseUserId = String(req.body.supabase_user_id ?? "").trim()

  if (!supabaseUserId) {
    res.status(400).json({ error: "Supabase user ID is required" })
    return
  }

  const user = registerUser(name, supabaseUserId)
  res.status(201).json(user)
})

export default router
