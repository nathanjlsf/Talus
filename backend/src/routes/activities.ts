import { Router } from "express"

import {
  findActivityById,
  listActivitiesForUser,
  recordActivity,
} from "../services/activityService.js"

import {
  appendActivityPoints,
  finishRecording,
  getHikeSummary,
  startRecording,
} from "../services/recordingService.js"

import type {
  ActivityPointInput,
} from "../repositories/activityPointRepository.js"

import type { MomentMark } from "../ranking/trackStats.js"

const MOMENTS = new Set<MomentMark>([
  "view",
  "climb",
  "rest",
])

function parsePoints(
  value: unknown
): ActivityPointInput[] | null {
  if (!Array.isArray(value) || value.length > 500) {
    return null
  }

  const points: ActivityPointInput[] = []

  for (const item of value) {
    if (!item || typeof item !== "object") {
      return null
    }

    const point = item as Record<string, unknown>
    const moment = point.moment ?? null

    if (
      typeof point.recorded_at !== "string" ||
      typeof point.latitude !== "number" ||
      typeof point.longitude !== "number" ||
      !Number.isFinite(point.latitude) ||
      !Number.isFinite(point.longitude) ||
      (
        point.accuracy !== undefined &&
        point.accuracy !== null &&
        typeof point.accuracy !== "number"
      ) ||
      (
        moment !== null &&
        (
          typeof moment !== "string" ||
          !MOMENTS.has(moment as MomentMark)
        )
      )
    ) {
      return null
    }

    points.push({
      recorded_at: point.recorded_at,
      latitude: point.latitude,
      longitude: point.longitude,
      accuracy:
        typeof point.accuracy === "number"
          ? point.accuracy
          : null,
      moment:
        moment === null
          ? null
          : (moment as MomentMark),
    })
  }

  return points
}

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

router.post("/start", (req, res) => {
  const { user_id, trail_id } = req.body

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
    const activity = startRecording({
      user_id,
      trail_id,
    })

    res.status(201).json(activity)
  } catch (error) {
    res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to start recording",
    })
  }
})

router.post("/:activityId/points", (req, res) => {
  const activityId = Number(req.params.activityId)
  const points = parsePoints(req.body?.points)

  if (!Number.isInteger(activityId) || !points) {
    res.status(400).json({
      error: "Invalid activity points",
    })

    return
  }

  try {
    const inserted = appendActivityPoints(
      activityId,
      points
    )

    res.status(201).json({
      inserted,
    })
  } catch (error) {
    res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to save points",
    })
  }
})

router.post("/:activityId/finish", async (req, res) => {
  const activityId = Number(req.params.activityId)

  if (!Number.isInteger(activityId)) {
    res.status(400).json({
      error: "Invalid activity ID",
    })

    return
  }

  try {
    const summary = await finishRecording(activityId)

    res.json(summary)
  } catch (error) {
    res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to finish recording",
    })
  }
})

router.get("/:activityId/summary", (req, res) => {
  const activityId = Number(req.params.activityId)

  if (!Number.isInteger(activityId)) {
    res.status(400).json({
      error: "Invalid activity ID",
    })

    return
  }

  try {
    res.json(getHikeSummary(activityId))
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load hike"

    res.status(message === "Activity not found" ? 404 : 400).json({
      error: message,
    })
  }
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