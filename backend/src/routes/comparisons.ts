import { Router } from "express"

import {
  calculateUserPreferences,
  listComparisonsForUser,
  recordComparison,
} from "../services/preferenceService.js"

import {
  getTrailsForUserSignals,
} from "../repositories/trailRepository.js"

import {
  selectComparisonPairs,
} from "../ranking/comparisonSelector.js"

import {
  loadScopedTrails,
} from "../services/trailService.js"

import {
  parseBbox,
} from "../geo/trailLines.js"

import {
  requireTalusUser,
  talusUserId,
} from "../auth/requireUser.js"

const router = Router()

router.use(requireTalusUser)

router.get("/next/:userId", (req, res) => {
  const userId = talusUserId(res)
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

  const trails = loadScopedTrails(userId, {
    county: county || undefined,
    bounds,
    limit: Number.isInteger(limitValue)
      ? limitValue
      : undefined,
  })

  const comparisons =
    listComparisonsForUser(userId)

  const excludeParam =
    String(req.query.exclude ?? "").trim()

  const excludedTrailIds =
    excludeParam
      ? excludeParam
          .split(",")
          .map(Number)
          .filter(Number.isInteger)
      : []

  const preferences =
    calculateUserPreferences(
      userId,
      getTrailsForUserSignals(userId)
    )

  const seenPairs =
    comparisons.map((comparison) => ({
      firstTrailId:
        comparison.winner_trail_id,

      secondTrailId:
        comparison.loser_trail_id,
    }))

  const pairs =
    selectComparisonPairs(
      trails,
      1,
      seenPairs,
      preferences,
      excludedTrailIds
    )

  if (pairs.length === 0) {
    res.status(404).json({
      error: "No more comparisons available",
    })
    return
  }

  const pair = pairs[0]

  if (!pair) {
    res.status(404).json({
      error: "Unable to select a comparison",
    })
    return
  }

  const firstTrail = trails.find(
    (trail) =>
      trail.id === pair.firstTrailId
  )

  const secondTrail = trails.find(
    (trail) =>
      trail.id === pair.secondTrailId
  )

  if (
    !firstTrail ||
    !secondTrail
  ) {
    res.status(404).json({
      error: "Unable to find selected trails",
    })
    return
  }

  res.json({
    firstTrail,
    secondTrail,
  })
})

router.get("/:userId", (_req, res) => {
  const comparisons = listComparisonsForUser(talusUserId(res))

  res.json(comparisons)
})

router.post("/", (req, res) => {
  const {
    winner_trail_id,
    loser_trail_id,
  } = req.body

  if (
    !Number.isInteger(winner_trail_id) ||
    !Number.isInteger(loser_trail_id)
  ) {
    res.status(400).json({
      error: "winner_trail_id and loser_trail_id must be integers",
    })

    return
  }

  try {
    const comparison = recordComparison({
      user_id: talusUserId(res),
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