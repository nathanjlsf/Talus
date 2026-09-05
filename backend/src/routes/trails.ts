import { Router } from "express"

import {
  addTrail,
  findTrail,
  listTrails,
  removeTrail,
} from "../services/trailService.js"

const router = Router()

router.get("/", (_req, res) => {
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