import { Router } from "express"

import {
  calculateUserPreferences,
  listComparisonsForUser,
  recordComparison,
} from "../services/preferenceService.js"

import {
  getAllTrails,
} from "../repositories/trailRepository.js"

import {
  selectComparisonPairs,
} from "../ranking/comparisonSelector.js"

const router = Router()

router.get("/next/:userId", (req, res) => {
  const userId = Number(req.params.userId)

  if (!Number.isInteger(userId)) {
    res.status(400).json({
      error: "Invalid user ID",
    })
    return
  }

  const trails = getAllTrails()

  const comparisons =
    listComparisonsForUser(userId)

  const preferences =
    calculateUserPreferences(userId)

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
      preferences
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