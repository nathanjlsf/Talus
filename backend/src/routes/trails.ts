import { Router } from "express"

import {
  addTrail,
  findTrail,
  listTrails,
  removeTrail,
  searchTrailList,
} from "../services/trailService.js"

const router = Router()

router.get("/", (req, res) => {
  const search = String(req.query.search ?? "").trim()
  const difficulty = String(req.query.difficulty ?? "").trim()

  const maxDistanceValue = Number(req.query.maxDistance)
  const maxElevationValue = Number(req.query.maxElevation)

  const maxDistance = Number.isFinite(maxDistanceValue)
    ? maxDistanceValue
    : undefined

  const maxElevation = Number.isFinite(maxElevationValue)
    ? maxElevationValue
    : undefined

  const hasFilters =
    search ||
    difficulty ||
    maxDistance !== undefined ||
    maxElevation !== undefined

  if (hasFilters) {
    const trails = searchTrailList({
      search,
      difficulty,
      maxDistance,
      maxElevation,
    })

    res.json(trails)
    return
  }

  const trails = listTrails()

  res.json(trails)
})

router.get("/:id", (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isInteger(id)) {
    res.status(400).json({
      error: "Invalid trail ID",
    })

    return
  }

  const trail = findTrail(id)

  if (!trail) {
    res.status(404).json({
      error: "Trail not found",
    })

    return
  }

  res.json(trail)
})

router.post("/", (req, res) => {
  const trail = addTrail(req.body)

  res.status(201).json(trail)
})

router.delete("/:id", (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isInteger(id)) {
    res.status(400).json({
      error: "Invalid trail ID",
    })

    return
  }

  const deleted = removeTrail(id)

  if (!deleted) {
    res.status(404).json({
      error: "Trail not found",
    })

    return
  }

  res.status(204).send()
})

export default router