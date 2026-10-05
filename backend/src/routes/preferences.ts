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

import {
  describePreferredRange,
} from "../ranking/preferredRange.js"

import {
  requireTalusUser,
  talusUserId,
} from "../auth/requireUser.js"

const router = Router()

router.use(requireTalusUser)

router.get("/:userId/ranking", (_req, res) => {
  const ranking = calculateRanking(talusUserId(res))

  res.json(ranking)
})

router.get("/:userId", (_req, res) => {
  const preferences =
    getUserPreferences(talusUserId(res))

  res.json(
    preferences.map((preference) => ({
      ...preference,
      preferredRange:
        describePreferredRange(preference),
    }))
  )
})

router.get("/:userId/insights", (_req, res) => {
  const preferences =
    getUserPreferences(talusUserId(res))

  const insights =
    generatePreferenceInsights(
      preferences
    )

  res.json(insights)
})

router.post("/:userId/recalculate", (_req, res) => {
  const preferences =
    updateUserPreferences(talusUserId(res))

  res.json(preferences)
})

export default router