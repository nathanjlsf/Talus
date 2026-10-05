import { Router, type Response } from "express"

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

import { activityOwnedByUser } from "../auth/activityAccess.js"
import {
  requireTalusUser,
  talusUserId,
} from "../auth/requireUser.js"
import { getActivityById } from "../repositories/activityRepository.js"

function ownedActivity(
  activityId: number,
  res: Response
) {
  const activity = getActivityById(activityId)

  if (!activityOwnedByUser(activity, talusUserId(res))) {
    res.status(404).json({
      error: "Activity not found",
    })

    return undefined
  }

  return activity
}

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

router.use(requireTalusUser)

router.get("/id/:activityId", (req, res) => {
  const activityId = Number(req.params.activityId)

  if (!Number.isInteger(activityId)) {
    res.status(400).json({
      error: "Invalid activity ID",
    })

    return
  }

  if (!ownedActivity(activityId, res)) {
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

router.get("/:userId", (_req, res) => {
  const activities = listActivitiesForUser(talusUserId(res))

  res.json(activities)
})

router.post("/start", (req, res) => {
  const { trail_id } = req.body

  if (!Number.isInteger(trail_id)) {
    res.status(400).json({
      error: "trail_id must be an integer",
    })

    return
  }

  try {
    const activity = startRecording({
      user_id: talusUserId(res),
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

  if (!ownedActivity(activityId, res)) {
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

  if (!ownedActivity(activityId, res)) {
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

  if (!ownedActivity(activityId, res)) {
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
    trail_id,
    started_at,
    ended_at,
    distance_miles,
    elevation_gain_feet,
    duration_seconds,
  } = req.body

  if (!Number.isInteger(trail_id)) {
    res.status(400).json({
      error: "trail_id must be an integer",
    })

    return
  }

  try {
    const activity = recordActivity({
      user_id: talusUserId(res),
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