import { Router } from "express"

import {
  addTrail,
  findTrail,
  listTrails,
  removeTrail,
  searchTrailList,
} from "../services/trailService.js"

import {
  getMapTrails,
  getTrailGeometryFeature,
} from "../services/trailMapService.js"

import {
  parseBbox,
} from "../geo/trailLines.js"

import {
  requireTalusUser,
  talusUserId,
} from "../auth/requireUser.js"

const router = Router()

router.get("/", (req, res) => {
  const search = String(req.query.search ?? "").trim()
  const location = String(req.query.location ?? "").trim()
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
    location ||
    difficulty ||
    maxDistance !== undefined ||
    maxElevation !== undefined

  if (hasFilters) {
    const trails = searchTrailList({
      search,
      location,
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

router.get("/map", requireTalusUser, (req, res) => {
  const userId = talusUserId(res)

  const bbox = String(req.query.bbox ?? "").trim()
  const bounds = bbox ? parseBbox(bbox) : null

  if (bbox && !bounds) {
    res.status(400).json({
      error: "bbox must be west,south,east,north",
    })

    return
  }

  res.json(
    getMapTrails({
      userId,
      bounds,
    })
  )
})

router.get("/:id/geometry", (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isInteger(id)) {
    res.status(400).json({
      error: "Invalid trail ID",
    })

    return
  }

  const feature = getTrailGeometryFeature(id)

  if (!feature) {
    res.status(404).json({
      error: "Trail geometry not found",
    })

    return
  }

  res.json(feature)
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