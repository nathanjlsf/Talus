import { Router } from "express"

import {
  calculateRanking,
} from "../services/rankingService.js"

const router = Router()

router.get("/:userId/ranking", (req, res) => {
  const userId = Number(req.params.userId)

  if (!Number.isInteger(userId)) {
    res.status(400).json({
      error: "Invalid user ID",
    })

    return
  }

  const ranking = calculateRanking(userId)

  res.json(ranking)
})

export default router