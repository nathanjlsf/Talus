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
  parseBbox,
} from "../geo/trailLines.js"

import {
  requireTalusUser,
  talusUserId,
} from "../auth/requireUser.js"

const router = Router()

router.use(requireTalusUser)

router.get("/:userId/ranking", (req, res) => {
  const county = String(req.query.county ?? "").trim()
  const limitValue = Number(req.query.limit)
  const bbox = String(req.query.bbox ?? "").trim()
  const bounds = bbox ? parseBbox(bbox) : null

  if (bbox && !bounds) {
    res.status(400).json({
      error: "bbox must be west,south,east,north",
    })

    return
  }

  const ranking = calculateRanking(talusUserId(res), {
    county: county || undefined,
    bounds,
    limit: Number.isInteger(limitValue)
      ? limitValue
      : undefined,
  })

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