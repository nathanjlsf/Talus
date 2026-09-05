import { Router } from "express"

import {
  listComparisonsForUser,
  recordComparison,
} from "../services/preferenceService.js"

const router = Router()

router.get("/:userId", (req, res) => {
  const userId = Number(req.params.userId)

  if (!Number.isInteger(userId)) {
    res.status(400).json({
      error: "Invalid user ID",
    })

    return
  }

  const comparisons = listComparisonsForUser(userId)

  res.json(comparisons)
})

router.post("/", (req, res) => {
  const {
    user_id,
    winner_trail_id,
    loser_trail_id,
  } = req.body

  if (
    !Number.isInteger(user_id) ||
    !Number.isInteger(winner_trail_id) ||
    !Number.isInteger(loser_trail_id)
  ) {
    res.status(400).json({
      error: "user_id, winner_trail_id, and loser_trail_id must be integers",
    })

    return
  }

  try {
    const comparison = recordComparison({
      user_id,
      winner_trail_id,
      loser_trail_id,
    })

    res.status(201).json(comparison)
  } catch (error) {
    res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to record comparison",
    })
  }
})

export default router