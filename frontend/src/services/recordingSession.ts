import {
  finishRecording,
  startRecording,
  uploadActivityPoints,
  type MomentMark,
  type TrackPointInput,
} from "./api"
import {
  readCurrentPosition,
  watchHikePosition,
  type LivePoint,
} from "./location"

const STORAGE_KEY = "talus-recording"
const MAX_ACCURACY_METERS = 30
const MAX_SPEED_METERS_PER_SECOND = 5

export type SessionPoint = TrackPointInput

export interface RecordingSession {
  activityId: number
  userId: number
  trailId: number
  trailName: string
  status: "recording" | "paused"
  startedAt: string
  accumulatedPauseMs: number
  pausedAt: string | null
  points: SessionPoint[]
  pendingIndex: number
  estimatedTimeMinutes?: number
}

interface Snapshot {
  session: RecordingSession | null
  locationError: string | null
}

const listeners = new Set<() => void>()
let locationError: string | null = null
let stopWatch: (() => void) | null = null
let flushTimer: number | null = null
let flushPromise: Promise<void> | null = null

function readSession(): RecordingSession | null {
  const raw = localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as RecordingSession
  } catch {
    return null
  }
}

function writeSession(session: RecordingSession | null) {
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }

  for (const listener of listeners) {
    listener()
  }
}

export async function discardRecording(activityId: number) {
  const session = readSession()

  if (!session || session.activityId !== activityId) {
    return
  }

  await stopWatching()
  locationError = null
  writeSession(null)
}

export function getRecordingSnapshot(): Snapshot {
  return {
    session: readSession(),
    locationError,
  }
}

export function subscribeRecording(listener: () => void) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

function distanceMeters(
  from: SessionPoint,
  to: SessionPoint
) {
  const toRadians = (degrees: number) =>
    (degrees * Math.PI) / 180
  const latitudeDelta = toRadians(to.latitude - from.latitude)
  const longitudeDelta = toRadians(
    to.longitude - from.longitude
  )
  const fromLatitude = toRadians(from.latitude)
  const toLatitude = toRadians(to.latitude)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2

  return (
    2 *
    6_371_000 *
    Math.asin(Math.min(1, Math.sqrt(haversine)))
  )
}

export function liveDistanceMiles(points: SessionPoint[]) {
  let meters = 0

  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1]
    const to = points[index]

    if (!from || !to) {
      continue
    }

    if (
      (from.accuracy !== null &&
        from.accuracy > MAX_ACCURACY_METERS) ||
      (to.accuracy !== null &&
        to.accuracy > MAX_ACCURACY_METERS)
    ) {
      continue
    }

    const seconds =
      (Date.parse(to.recorded_at) -
        Date.parse(from.recorded_at)) /
      1000
    const step = distanceMeters(from, to)

    if (seconds <= 0 || step / seconds > MAX_SPEED_METERS_PER_SECOND) {
      continue
    }

    meters += step
  }

  return meters / 1609.344
}

export function elapsedMs(
  session: RecordingSession,
  now = Date.now()
) {
  let paused = session.accumulatedPauseMs

  if (session.pausedAt) {
    paused += now - Date.parse(session.pausedAt)
  }

  return Math.max(0, now - Date.parse(session.startedAt) - paused)
}

async function stopWatching() {
  if (flushTimer !== null) {
    window.clearInterval(flushTimer)
    flushTimer = null
  }

  const stop = stopWatch
  stopWatch = null
  stop?.()
}

async function flushPending() {
  const session = readSession()

  if (
    !session ||
    session.pendingIndex >= session.points.length
  ) {
    return
  }

  const nextIndex = session.points.length
  const batch = session.points.slice(session.pendingIndex)

  try {
    await uploadActivityPoints(session.activityId, batch)
    locationError = null
    const current = readSession()

    if (current && current.activityId === session.activityId) {
      current.pendingIndex = Math.max(
        current.pendingIndex,
        nextIndex
      )
      writeSession(current)
    }
  } catch {
    locationError =
      "Track points are saved on this phone and will upload when you have a connection."
    for (const listener of listeners) {
      listener()
    }
  }
}

export function flushTrack(): Promise<void> {
  const previous = flushPromise ?? Promise.resolve()
  const run = previous
    .catch(() => undefined)
    .then(() => flushPending())

  flushPromise = run
  void run.finally(() => {
    if (flushPromise === run) {
      flushPromise = null
    }
  })

  return run
}

export async function attachWatcher() {
  const session = readSession()

  if (!session || session.status !== "recording" || stopWatch) {
    return
  }

  stopWatch = await watchHikePosition(
    (point: LivePoint) => {
      const current = readSession()

      if (!current || current.status !== "recording") {
        return
      }

      current.points.push({
        ...point,
        moment: null,
      })
      locationError = null
      writeSession(current)

      if (current.points.length - current.pendingIndex >= 8) {
        void flushTrack()
      }
    },
    (message) => {
      locationError = message
      for (const listener of listeners) {
        listener()
      }
    }
  )

  flushTimer = window.setInterval(() => {
    void flushTrack()
  }, 15000)
}

export async function beginRecording(input: {
  userId: number
  trailId: number
  trailName: string
  estimatedTimeMinutes: number
}) {
  const firstPoint = await readCurrentPosition()
  const activity = await startRecording(
    input.userId,
    input.trailId
  )

  writeSession({
    activityId: activity.id,
    userId: input.userId,
    trailId: input.trailId,
    trailName: input.trailName,
    status: "recording",
    startedAt: activity.started_at ?? new Date().toISOString(),
    accumulatedPauseMs: 0,
    pausedAt: null,
    points: [
      {
        ...firstPoint,
        moment: null,
      },
    ],
    pendingIndex: 0,
    estimatedTimeMinutes: input.estimatedTimeMinutes,
  })

  void flushTrack()
  await attachWatcher()
}

export async function pauseRecording() {
  const session = readSession()

  if (!session || session.status !== "recording") {
    return
  }

  session.status = "paused"
  session.pausedAt = new Date().toISOString()
  writeSession(session)
  await flushTrack()
  await stopWatching()
}

export async function resumeRecording() {
  const session = readSession()

  if (!session || session.status !== "paused" || !session.pausedAt) {
    return
  }

  session.accumulatedPauseMs +=
    Date.now() - Date.parse(session.pausedAt)
  session.pausedAt = null
  session.status = "recording"
  writeSession(session)
  await attachWatcher()
}

export async function markMoment(moment: MomentMark) {
  const session = readSession()

  if (!session) {
    return
  }

  const last = [...session.points]
    .reverse()
    .find((point) => point.moment === null)
  const position = last ?? (await readCurrentPosition())

  session.points.push({
    recorded_at: new Date().toISOString(),
    latitude: position.latitude,
    longitude: position.longitude,
    accuracy: position.accuracy,
    moment,
  })
  writeSession(session)
  void flushTrack()
}

export async function finishHike() {
  await flushTrack()
  await stopWatching()

  const session = readSession()

  if (!session) {
    throw new Error("No hike in progress")
  }

  const summary = await finishRecording(session.activityId)
  writeSession(null)
  locationError = null
  return summary
}
