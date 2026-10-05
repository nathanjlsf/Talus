import assert from "node:assert/strict"
import test from "node:test"

import {
  daylightNote,
  distanceMeters,
  finishEstimate,
  guideOnTrail,
  isOffRoute,
  sunsetAt,
} from "./hikeGuidance.ts"

const line = [
  [
    [-122.5, 37.8],
    [-122.4, 37.8],
  ],
]

test("snaps a point on the trail and reports halfway progress", () => {
  const guidance = guideOnTrail({
    paths: line,
    position: { longitude: -122.45, latitude: 37.8 },
    origin: { longitude: -122.5, latitude: 37.8 },
    wasOffRoute: false,
  })

  assert.ok(guidance)
  assert.ok(guidance.distanceOffMeters < 5)
  assert.ok(Math.abs(guidance.progress - 0.5) < 0.03)
  assert.equal(guidance.offRoute, false)
  assert.ok(guidance.completed.length >= 2)
})

test("joins connected ways before measuring progress", () => {
  const guidance = guideOnTrail({
    paths: [
      [
        [-122.5, 37.8],
        [-122.45, 37.8],
      ],
      [
        [-122.45, 37.8],
        [-122.4, 37.8],
      ],
    ],
    position: { longitude: -122.45, latitude: 37.8 },
    origin: { longitude: -122.5, latitude: 37.8 },
    wasOffRoute: false,
  })

  assert.ok(guidance)
  assert.ok(Math.abs(guidance.progress - 0.5) < 0.03)
  assert.ok(guidance.totalMeters > 8000)
})

test("orients the route from the trailhead you started at", () => {
  const guidance = guideOnTrail({
    paths: line,
    position: { longitude: -122.41, latitude: 37.8 },
    origin: { longitude: -122.4, latitude: 37.8 },
    wasOffRoute: false,
  })

  assert.ok(guidance)
  assert.ok(guidance.progress < 0.2)
})

test("flags a point about 40 m off the route", () => {
  const north = 37.8 + 100 / 111_320
  const guidance = guideOnTrail({
    paths: line,
    position: { longitude: -122.45, latitude: north },
    origin: { longitude: -122.5, latitude: 37.8 },
    wasOffRoute: false,
  })

  assert.ok(guidance)
  assert.ok(guidance.distanceOffMeters > 40)
  assert.equal(guidance.offRoute, true)
  assert.equal(
    isOffRoute(guidance.distanceOffMeters, false),
    true
  )
})

test("keeps the off-route alert until you are back within 25 m", () => {
  assert.equal(isOffRoute(30, true), true)
  assert.equal(isOffRoute(30, false), false)
  assert.equal(isOffRoute(20, true), false)
})

test("uses your pace once the hike has some distance", () => {
  const estimate = finishEstimate({
    remainingMeters: 1000,
    traveledMeters: 1000,
    movingSeconds: 1000,
    estimatedTimeMinutes: 30,
    routeMeters: 2000,
  })

  assert.deepEqual(estimate, { seconds: 1000, basis: "pace" })
})

test("falls back to the trail estimate before your pace is known", () => {
  const estimate = finishEstimate({
    remainingMeters: 1000,
    traveledMeters: 50,
    movingSeconds: 40,
    estimatedTimeMinutes: 20,
    routeMeters: 2000,
  })

  assert.ok(estimate)
  assert.equal(estimate.basis, "trail")
  assert.ok(Math.abs(estimate.seconds - 600) < 1)
})

test("sunset for San Francisco in June is early the next UTC morning", () => {
  const sunset = sunsetAt(
    new Date("2024-06-21T20:00:00Z"),
    37.77,
    -122.42
  )

  assert.ok(sunset)
  assert.equal(sunset.toISOString().slice(0, 10), "2024-06-22")
  const hour = sunset.getUTCHours() + sunset.getUTCMinutes() / 60
  assert.ok(hour > 3.2 && hour < 3.9)
})

test("warns when your pace would finish after sunset", () => {
  const now = new Date("2024-06-21T20:00:00Z")
  const late = daylightNote(now, 10 * 3600, 37.77, -122.42, "pace")
  const early = daylightNote(now, 3600, 37.77, -122.42, "pace")

  assert.equal(late, "At your pace you'd finish after sunset.")
  assert.equal(early, null)
  assert.ok(distanceMeters(
    { longitude: -122.5, latitude: 37.8 },
    { longitude: -122.4, latitude: 37.8 }
  ) > 8000)
})
