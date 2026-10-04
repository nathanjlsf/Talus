import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router"

import ElevationProfile from "../components/ElevationProfile"
import RecordMap from "../components/RecordMap"
import {
  getCurrentTalusUser,
  getHikeSummary,
  getTrailGeometry,
  submitComparison,
  type HikeSummary as HikeSummaryData,
} from "../services/api"

const MAX_QUESTIONS = 3

function formatDuration(seconds: number | null) {
  if (seconds === null) {
    return "—"
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes} min`
}

function formatPace(secondsPerMile: number | null) {
  if (secondsPerMile === null || secondsPerMile <= 0) {
    return "—"
  }

  const minutes = Math.floor(secondsPerMile / 60)
  const seconds = Math.round(secondsPerMile % 60)

  return `${minutes}:${String(seconds).padStart(2, "0")} / mi`
}

function whenSentence(startedAt: string | null) {
  if (!startedAt) {
    return null
  }

  const date = new Date(startedAt)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  const hour = date.getHours()
  const part =
    hour < 11
      ? "morning"
      : hour < 14
        ? "midday"
        : hour < 17
          ? "afternoon"
          : "evening"
  const day = date.toLocaleDateString("en-US", {
    weekday: "long",
  })

  return `You started on a ${day} ${part}.`
}

function HikeSummary() {
  const { activityId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const shouldPlace = Boolean(
    (location.state as { place?: boolean } | null)?.place
  )
  const [summary, setSummary] = useState<HikeSummaryData | null>(
    null
  )
  const [trailPaths, setTrailPaths] = useState<number[][][]>([])
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<number | null>(null)
  const [low, setLow] = useState(0)
  const [high, setHigh] = useState(-1)
  const [asked, setAsked] = useState(0)
  const [placing, setPlacing] = useState(false)
  const activityNumber = Number(activityId)
  const invalidId = !Number.isInteger(activityNumber)

  useEffect(() => {
    if (invalidId) {
      return
    }

    void getHikeSummary(activityNumber)
      .then((data) => {
        setSummary(data)
        setHigh(data.placement.length - 1)
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Couldn't load this hike"
        )
      })

    void getCurrentTalusUser()
      .then((user) => setUserId(user.id))
      .catch(() => setUserId(null))
  }, [activityNumber, invalidId])

  useEffect(() => {
    if (!summary) {
      return
    }

    void getTrailGeometry(summary.trail.id)
      .then((feature) => {
        setTrailPaths(feature.geometry.coordinates)
      })
      .catch(() => {
        setTrailPaths([])
      })
  }, [summary])

  if (invalidId || error) {
    return (
      <section className="mx-auto max-w-2xl">
        <p className="text-[#7a3b2e]">
          {error ?? "That hike could not be found."}
        </p>
      </section>
    )
  }

  if (!summary) {
    return (
      <section className="mx-auto max-w-2xl">
        <p className="text-[#687565]">Loading your hike...</p>
      </section>
    )
  }

  const when = whenSentence(summary.activity.started_at)
  const opponentIndex =
    low <= high ? Math.floor((low + high) / 2) : null
  const opponent =
    opponentIndex === null
      ? null
      : summary.placement[opponentIndex]
  const showPlacement =
    shouldPlace &&
    asked < MAX_QUESTIONS &&
    opponent !== undefined &&
    opponent !== null

  async function choose(newHikeWon: boolean) {
    if (!summary || !opponent || userId === null || opponentIndex === null) {
      return
    }

    try {
      setPlacing(true)
      await submitComparison(
        userId,
        newHikeWon ? summary.trail.id : opponent.id,
        newHikeWon ? opponent.id : summary.trail.id
      )

      if (newHikeWon) {
        setHigh(opponentIndex - 1)
      } else {
        setLow(opponentIndex + 1)
      }

      setAsked((count) => count + 1)
    } finally {
      setPlacing(false)
    }
  }

  const track = summary.route?.coordinates ?? []

  return (
    <section className="mx-auto max-w-2xl">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#687565]">
        After the hike
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        {summary.trail.name}
      </h1>

      <div className="mt-6 rounded-3xl border border-[#d8d2c4] bg-[#ebe6da] p-5">
        <h2 className="text-lg font-semibold">
          What Talus learned
        </h2>
        <ul className="mt-3 space-y-3 leading-7 text-[#526052]">
          {when && <li>{when}</li>}
          {summary.learned.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4 h-72 overflow-hidden rounded-3xl border border-[#d8d2c4]">
        <RecordMap
          trailPaths={trailPaths}
          track={track}
          position={null}
        />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        {[
          [
            "Distance",
            summary.activity.distance_miles === null
              ? "—"
              : `${summary.activity.distance_miles.toFixed(2)} mi`,
          ],
          [
            "Elevation",
            summary.activity.elevation_gain_feet === null
              ? "—"
              : `${summary.activity.elevation_gain_feet.toLocaleString()} ft`,
          ],
          [
            "Moving",
            formatDuration(summary.activity.moving_seconds),
          ],
          [
            "Total",
            formatDuration(summary.activity.duration_seconds),
          ],
          [
            "Pace",
            formatPace(summary.activity.pace_seconds_per_mile),
          ],
          [
            "Trail",
            summary.activity.completion_fraction === null
              ? "—"
              : `${Math.round(
                  summary.activity.completion_fraction * 100
                )}% of the trail`,
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-[#d8d2c4] bg-[#ebe6da] p-4"
          >
            <dt className="text-sm text-[#687565]">{label}</dt>
            <dd className="mt-1 text-lg font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      {summary.splits.length > 0 && (
        <div className="mt-4 rounded-3xl border border-[#d8d2c4] bg-[#ebe6da] p-5">
          <h2 className="font-semibold">Splits</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#526052]">
            {summary.splits.map((split) => (
              <li key={split.mile}>
                Mile {split.mile}: {formatPace(split.seconds)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 rounded-3xl border border-[#d8d2c4] bg-[#ebe6da] p-5">
        <h2 className="font-semibold">Elevation</h2>
        <div className="mt-3">
          <ElevationProfile samples={summary.elevation_profile} />
        </div>
      </div>

      {shouldPlace && (
        <div className="mt-4 rounded-3xl border border-[#d8d2c4] bg-[#ebe6da] p-5">
          <h2 className="font-semibold">Where does this hike fit?</h2>

          {showPlacement && opponent ? (
            <>
              <p className="mt-2 leading-7 text-[#526052]">
                Which do you want more hikes like?
              </p>
              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  disabled={placing || userId === null}
                  onClick={() => {
                    void choose(true)
                  }}
                  className="min-h-12 rounded-2xl bg-[#314936] px-4 font-medium text-white disabled:opacity-40"
                >
                  {summary.trail.name}
                </button>
                <button
                  type="button"
                  disabled={placing || userId === null}
                  onClick={() => {
                    void choose(false)
                  }}
                  className="min-h-12 rounded-2xl border border-[#d8d2c4] bg-white px-4 font-medium disabled:opacity-40"
                >
                  {opponent.name}
                  <span className="mt-1 block text-sm font-normal text-[#687565]">
                    {opponent.distance_miles} mi
                    {opponent.location
                      ? ` · ${opponent.location}`
                      : ""}
                  </span>
                </button>
              </div>
            </>
          ) : (
            <p className="mt-2 leading-7 text-[#526052]">
              {summary.placement.length === 0
                ? "Once you've logged another hike, Talus will ask which one you prefer."
                : "Talus placed this hike among the ones you've done."}
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => {
            navigate(`/activities/${summary.activity.id}/experience`)
          }}
          className="min-h-12 rounded-full bg-[#314936] font-medium text-white"
        >
          Tell Talus how it went
        </button>
        <Link
          to="/activities"
          className="flex min-h-12 items-center justify-center rounded-full border border-[#d8d2c4] font-medium"
        >
          Back to your hikes
        </Link>
      </div>
    </section>
  )
}

export default HikeSummary
