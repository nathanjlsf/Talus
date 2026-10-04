import {
  createActivity,
  getActivityById,
  getActivityWithTrailById,
  listHikedTrails,
  markActivityRecording,
  saveRecordingResult,
} from "../repositories/activityRepository.js"

import {
  getActivityPoints,
  insertActivityPoints,
  type ActivityPointInput,
} from "../repositories/activityPointRepository.js"

import { getTrailById } from "../repositories/trailRepository.js"

import { getTrailGeometryLines } from "../repositories/trailGeometryRepository.js"

import { getComparisonsForUser } from "../repositories/comparisonRepository.js"

import { calculateElevationGain } from "../import/elevation/elevationGain.js"

import { getElevationFromDem } from "../import/elevation/dem.js"

import { rankHikes } from "../ranking/hikePlacement.js"

import {
  describeTrack,
  paceRatioFor,
} from "../ranking/trackSignal.js"

import {
  distanceMeters,
  summarizeTrack,
  usablePoints,
  type LatLon,
  type TrackPoint,
} from "../ranking/trackStats.js"

import { updateUserPreferences } from "./preferenceService.js"

const SAMPLE_SPACING_METERS = 80

export interface ElevationSample {
  distance_miles: number
  elevation_feet: number
}

export function startRecording(input: {
  user_id: number
  trail_id: number
}) {
  if (input.user_id <= 0) {
    throw new Error("Invalid user ID")
  }

  if (!getTrailById(input.trail_id)) {
    throw new Error("Trail not found")
  }

  const activity = createActivity({
    user_id: input.user_id,
    trail_id: input.trail_id,
    started_at: new Date().toISOString(),
  })

  markActivityRecording(activity.id)

  const recording = getActivityById(activity.id)

  if (!recording) {
    throw new Error("Activity not found")
  }

  return recording
}

export function appendActivityPoints(
  activityId: number,
  points: ActivityPointInput[]
): number {
  const activity = getActivityById(activityId)

  if (!activity) {
    throw new Error("Activity not found")
  }

  if (points.length === 0) {
    return 0
  }

  return insertActivityPoints(activityId, points)
}

function toTrackPoints(
  points: ActivityPointInput[]
): TrackPoint[] {
  return points.map((point) => ({
    recordedAt: point.recorded_at,
    latitude: point.latitude,
    longitude: point.longitude,
    accuracy: point.accuracy,
    moment: point.moment,
  }))
}

async function sampleElevation(
  points: TrackPoint[]
): Promise<ElevationSample[]> {
  const samples: ElevationSample[] = []
  let traveled = 0
  let sinceSample = Number.POSITIVE_INFINITY
  let previous: LatLon | null = null
  let attempted = false

  for (const point of points) {
    if (previous) {
      const step = distanceMeters(previous, point)
      traveled += step
      sinceSample += step
    }

    previous = point

    if (
      attempted &&
      sinceSample < SAMPLE_SPACING_METERS
    ) {
      continue
    }

    attempted = true

    try {
      const elevationFeet = await getElevationFromDem(
        point.latitude,
        point.longitude
      )

      samples.push({
        distance_miles: traveled / 1609.344,
        elevation_feet: elevationFeet,
      })
      sinceSample = 0
    } catch {
      sinceSample = 0
    }
  }

  return samples
}

export async function finishRecording(
  activityId: number
) {
  const activity = getActivityById(activityId)

  if (!activity) {
    throw new Error("Activity not found")
  }

  const trail = getTrailById(activity.trail_id)

  if (!trail) {
    throw new Error("Trail not found")
  }

  const stored = getActivityPoints(activityId)
  const recorded = toTrackPoints(stored)
  const points = usablePoints(recorded)
  const endedAt =
    activity.ended_at ?? new Date().toISOString()
  const lines = getTrailGeometryLines(
    activity.trail_id
  ).map((line) =>
    line.map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
    }))
  )

  const summary = summarizeTrack({
    points: recorded,
    startedAt: activity.started_at,
    endedAt,
    trailDistanceMiles: trail.distance_miles,
    trailLines: lines,
  })

  const profile =
    points.length > 0
      ? await sampleElevation(points)
      : []

  const elevationGain =
    profile.length >= 2
      ? calculateElevationGain(profile)
      : null

  saveRecordingResult(activityId, {
    ended_at: endedAt,
    distance_miles: Number(
      summary.distanceMiles.toFixed(2)
    ),
    elevation_gain_feet: elevationGain,
    duration_seconds: summary.durationSeconds,
    moving_seconds: summary.movingSeconds,
    pace_seconds_per_mile:
      summary.paceSecondsPerMile,
    completion_fraction: summary.completionFraction,
    turned_around: summary.turnedAround,
    long_stop_count: summary.longStops.length,
    view_moments: summary.moments.view,
    climb_moments: summary.moments.climb,
    rest_moments: summary.moments.rest,
    elevation_profile: JSON.stringify(profile),
  })

  if (summary.completionFraction !== null) {
    updateUserPreferences(activity.user_id)
  }

  return getHikeSummary(activityId)
}

export interface HikeSummary {
  activity: {
    id: number
    user_id: number
    trail_id: number
    started_at: string | null
    ended_at: string | null
    distance_miles: number | null
    elevation_gain_feet: number | null
    duration_seconds: number | null
    moving_seconds: number | null
    pace_seconds_per_mile: number | null
    completion_fraction: number | null
  }
  trail: {
    id: number
    name: string
    location: string | null
    distance_miles: number
    elevation_gain_feet: number
    estimated_time_minutes: number
  }
  learned: string[]
  splits: Array<{ mile: number; seconds: number }>
  route: {
    type: "LineString"
    coordinates: number[][]
  } | null
  elevation_profile: ElevationSample[]
  placement: Array<{
    id: number
    name: string
    location: string | null
    distance_miles: number
    elevation_gain_feet: number
  }>
}

export function getHikeSummary(
  activityId: number
): HikeSummary {
  const activity = getActivityWithTrailById(activityId)
  const stored = getActivityById(activityId)

  if (!activity || !stored) {
    throw new Error("Activity not found")
  }

  const trail = getTrailById(activity.trail_id)

  if (!trail) {
    throw new Error("Trail not found")
  }

  const recorded = toTrackPoints(
    getActivityPoints(activityId)
  )
  const points = usablePoints(recorded)
  const lines = getTrailGeometryLines(
    activity.trail_id
  ).map((line) =>
    line.map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
    }))
  )

  const summary = summarizeTrack({
    points,
    startedAt: stored.started_at,
    endedAt: stored.ended_at,
    trailDistanceMiles: trail.distance_miles,
    trailLines: lines,
  })

  let profile: ElevationSample[] = []

  if (stored.elevation_profile) {
    try {
      const parsed = JSON.parse(
        stored.elevation_profile
      ) as ElevationSample[]

      if (Array.isArray(parsed)) {
        profile = parsed
      }
    } catch {
      profile = []
    }
  }

  const paceRatio = paceRatioFor(
    stored.pace_seconds_per_mile ??
      summary.paceSecondsPerMile,
    trail.estimated_time_minutes,
    trail.distance_miles
  )

  const comparisons = getComparisonsForUser(
    activity.user_id
  )
  const pastHikes = listHikedTrails(
    activity.user_id,
    activity.trail_id
  )
  const rankedIds = rankHikes(
    pastHikes.map((hike) => ({
      trailId: hike.trailId,
      latestAt: hike.latestAt,
    })),
    comparisons.map((comparison) => ({
      winnerTrailId: comparison.winner_trail_id,
      loserTrailId: comparison.loser_trail_id,
    }))
  )
  const hikesById = new Map(
    pastHikes.map((hike) => [hike.trailId, hike])
  )

  return {
    activity: {
      id: activity.id,
      user_id: activity.user_id,
      trail_id: activity.trail_id,
      started_at: stored.started_at,
      ended_at: stored.ended_at,
      distance_miles: stored.distance_miles,
      elevation_gain_feet: stored.elevation_gain_feet,
      duration_seconds: stored.duration_seconds,
      moving_seconds: stored.moving_seconds,
      pace_seconds_per_mile:
        stored.pace_seconds_per_mile,
      completion_fraction: stored.completion_fraction,
    },
    trail: {
      id: trail.id,
      name: trail.name,
      location: trail.location,
      distance_miles: trail.distance_miles,
      elevation_gain_feet: trail.elevation_gain_feet,
      estimated_time_minutes:
        trail.estimated_time_minutes,
    },
    learned: describeTrack({
      completionFraction:
        stored.completion_fraction ??
        summary.completionFraction,
      turnedAround: stored.turned_around
        ? stored.turned_around === 1
        : summary.turnedAround,
      paceRatio,
      longStopCount:
        stored.long_stop_count ??
        summary.longStops.length,
      viewMoments:
        stored.view_moments ?? summary.moments.view,
      climbMoments:
        stored.climb_moments ?? summary.moments.climb,
      restMoments:
        stored.rest_moments ?? summary.moments.rest,
      hadPoints: recorded.length > 0,
      usablePointCount: points.length,
    }),
    splits: summary.splits,
    route:
      points.length >= 2
        ? {
            type: "LineString",
            coordinates: points.map((point) => [
              point.longitude,
              point.latitude,
            ]),
          }
        : null,
    elevation_profile: profile,
    placement: rankedIds.flatMap((trailId) => {
      const hike = hikesById.get(trailId)

      if (!hike) {
        return []
      }

      return [
        {
          id: hike.trailId,
          name: hike.name,
          location: hike.location,
          distance_miles: hike.distance_miles,
          elevation_gain_feet:
            hike.elevation_gain_feet,
        },
      ]
    }),
  }
}
