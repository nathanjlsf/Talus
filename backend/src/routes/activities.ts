import { Router } from "express"

import {
  findActivityById,
  listActivitiesForUser,
  recordActivity,
} from "../services/activityService.js"

const router = Router()

router.get("/id/:activityId", (req, res) => {
  const activityId = Number(req.params.activityId)

  if (!Number.isInteger(activityId)) {
    res.status(400).json({
      error: "Invalid activity ID",
    })

    return
  }

  const activity = findActivityById(activityId)

  if (!activity) {
    res.status(404).json({
      error: "Activity not found",
    })

    return
  }

  res.json(activity)
})

router.get("/:userId", (req, res) => {
  const userId = Number(req.params.userId)

  if (!Number.isInteger(userId)) {
    res.status(400).json({
      error: "Invalid user ID",
    })

    return
  }

  const activities = listActivitiesForUser(userId)

  res.json(activities)
})

router.post("/", (req, res) => {
  const {
    user_id,
    trail_id,
    started_at,
    ended_at,
    distance_miles,
    elevation_gain_feet,
    duration_seconds,
  } = req.body

  if (
    !Number.isInteger(user_id) ||
    !Number.isInteger(trail_id)
  ) {
    res.status(400).json({
      error: "user_id and trail_id must be integers",
    })

    return
  }

  try {
    const activity = recordActivity({
      user_id,
      trail_id,
      started_at,
      ended_at,
      distance_miles,
      elevation_gain_feet,
      duration_seconds,
    })

    res.status(201).json(activity)
  } catch (error) {
    res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to record activity",
    })
  }
})

export default router