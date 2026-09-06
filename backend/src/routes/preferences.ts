import { Router } from "express"

import {
  calculateRanking,
} from "../services/rankingService.js"

import {
  updateUserPreferences,
  getUserPreferences,
} from "../services/preferenceService.js"

import {
  generatePreferenceInsights,
} from "../ranking/preferenceInsights.js"

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

router.get("/:userId", (req, res) => {
  const userId = Number(req.params.userId)

  if (!Number.isInteger(userId)) {
    res.status(400).json({
      error: "Invalid user ID",
    })

    return
  }

  const preferences =
    getUserPreferences(userId)

  res.json(preferences)
})

router.get("/:userId/insights", (req, res) => {
  const userId = Number(req.params.userId)

  if (!Number.isInteger(userId)) {
    res.status(400).json({
      error: "Invalid user ID",
    })

    return
  }

  const preferences =
    getUserPreferences(userId)

  const insights =
    generatePreferenceInsights(
      preferences
    )

  res.json(insights)
})

router.post("/:userId/recalculate", (req, res) => {
  const userId = Number(req.params.userId)

  if (!Number.isInteger(userId)) {
    res.status(400).json({
      error: "Invalid user ID",
    })

    return
  }

  const preferences =
    updateUserPreferences(userId)

  res.json(preferences)
})

export default router