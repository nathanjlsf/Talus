import { Router } from "express"

import {
  findExperienceForActivity,
  recordExperience,
} from "../services/experienceService.js"

const router = Router()

router.get("/:activityId", (req, res) => {
  const activityId = Number(req.params.activityId)

  if (!Number.isInteger(activityId)) {
    res.status(400).json({
      error: "Invalid activity ID",
    })

    return
  }

  const experience =
    findExperienceForActivity(activityId)

  if (!experience) {
    res.status(404).json({
      error: "Experience not found",
    })

    return
  }

  res.json(experience)
})

router.post("/", (req, res) => {
  const {
    activity_id,
    overall_rating,
    scenic_rating,
    difficulty_rating,
    solitude_rating,
    notes,
  } = req.body

  if (
    !Number.isInteger(activity_id) ||
    !Number.isInteger(overall_rating)
  ) {
    res.status(400).json({
      error:
        "activity_id and overall_rating must be integers",
    })

    return
  }

  try {
    const experience = recordExperience({
      activity_id,
      overall_rating,
      scenic_rating,
      difficulty_rating,
      solitude_rating,
      notes,
    })

    res.status(201).json(experience)
  } catch (error) {
    res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to record experience",
    })
  }
})

export default router