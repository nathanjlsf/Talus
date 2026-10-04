import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import { Pause, Play, Plus, Square } from "lucide-react"

import RecordMap from "../components/RecordMap"
import {
  getCurrentTalusUser,
  getTrailGeometry,
  getTrails,
  type MomentMark,
  type Trail,
} from "../services/api"
import { isNativeApp } from "../services/location"
import {
  attachWatcher,
  beginRecording,
  elapsedMs,
  finishHike,
  getRecordingSnapshot,
  liveDistanceMiles,
  markMoment,
  pauseRecording,
  resumeRecording,
  subscribeRecording,
  type RecordingSession,
} from "../services/recordingSession"
function formatClock(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const clock = [minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":")

  return hours > 0 ? `${hours}:${clock}` : clock
}

const moments: Array<{ id: MomentMark; label: string }> = [
  { id: "view", label: "Great view" },
  { id: "climb", label: "Tough climb" },
  { id: "rest", label: "Rest stop" },
]

function Record() {
  const navigate = useNavigate()
  const [session, setSession] = useState<RecordingSession | null>(
    () => getRecordingSnapshot().session
  )
  const [locationError, setLocationError] = useState<string | null>(
    () => getRecordingSnapshot().locationError
  )
  const [query, setQuery] = useState("")
  const [trails, setTrails] = useState<Trail[]>([])
  const [selected, setSelected] = useState<Trail | null>(null)
  const [trailPaths, setTrailPaths] = useState<number[][][]>([])
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return subscribeRecording(() => {
      const snapshot = getRecordingSnapshot()
      setSession(snapshot.session)
      setLocationError(snapshot.locationError)
    })
  }, [])

  useEffect(() => {
    void attachWatcher()
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (session) {
      return
    }

    const timer = window.setTimeout(() => {
      void getTrails({ search: query })
        .then(setTrails)
        .catch(() => {
          setTrails([])
        })
    }, 250)

    return () => window.clearTimeout(timer)
  }, [query, session])

  const trailId = session?.trailId ?? null

  useEffect(() => {
    if (trailId === null) {
      return
    }

    void getTrailGeometry(trailId)
      .then((feature) => {
        setTrailPaths(feature.geometry.coordinates)
      })
      .catch(() => {
        setTrailPaths([])
      })
  }, [trailId])

  async function start() {
    if (!selected) {
      return
    }

    try {
      setBusy(true)
      setError(null)
      const user = await getCurrentTalusUser()
      await beginRecording({
        userId: user.id,
        trailId: selected.id,
        trailName: selected.name,
      })
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "Couldn't start recording"
      )
    } finally {
      setBusy(false)
    }
  }

  async function finish() {
    try {
      setBusy(true)
      setError(null)
      const summary = await finishHike()
      navigate(`/activities/${summary.activity.id}`, {
        state: { place: true },
      })
    } catch (finishError) {
      setError(
        finishError instanceof Error
          ? finishError.message
          : "Couldn't finish the hike"
      )
    } finally {
      setBusy(false)
    }
  }

  if (!session) {
    return (
      <section className="mx-auto flex h-full min-h-0 max-w-2xl flex-col overflow-y-auto px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#687565]">
          Record
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Track a hike
        </h1>
        <p className="mt-3 leading-7 text-[#687565]">
          Choose the trail, then start. Talus keeps the track on
          this phone and uploads it in batches.
          {isNativeApp()
            ? " Recording continues with the screen locked."
            : " In the browser, keep this tab open."}
        </p>

        <label className="mt-6 block text-sm font-medium" htmlFor="trail-search">
          Trail
        </label>
        <input
          id="trail-search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setSelected(null)
          }}
          placeholder="Search trails"
          className="mt-2 min-h-12 w-full rounded-2xl border border-[#d8d2c4] bg-white px-4"
        />

        <div className="mt-4 space-y-2">
          {trails.slice(0, 8).map((trail) => {
            const active = selected?.id === trail.id

            return (
              <button
                key={trail.id}
                type="button"
                onClick={() => setSelected(trail)}
                className={`min-h-12 w-full rounded-2xl border px-4 py-3 text-left ${
                  active
                    ? "border-[#314936] bg-[#314936] text-white"
                    : "border-[#d8d2c4] bg-[#ebe6da]"
                }`}
              >
                <span className="block font-medium">{trail.name}</span>
                <span
                  className={`mt-1 block text-sm ${
                    active ? "text-white/80" : "text-[#687565]"
                  }`}
                >
                  {trail.distance_miles} mi
                  {trail.location ? ` · ${trail.location}` : ""}
                </span>
              </button>
            )
          })}
        </div>

        {error && (
          <p className="mt-4 text-sm text-[#7a3b2e]">{error}</p>
        )}

        <button
          type="button"
          disabled={!selected || busy}
          onClick={() => {
            void start()
          }}
          className="mt-6 flex min-h-12 w-full items-center justify-center rounded-full bg-[#314936] px-6 font-medium text-white disabled:opacity-40"
        >
          {busy ? "Starting..." : "Start hike"}
        </button>

        <Link
          to="/add-hike"
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#d8d2c4] px-6 font-medium"
        >
          <Plus size={18} />
          Log a past hike
        </Link>
      </section>
    )
  }

  const track = session.points
    .filter((point) => point.moment === null)
    .map(
      (point) =>
        [point.longitude, point.latitude] as [number, number]
    )
  const last = track[track.length - 1] ?? null

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="min-h-48 flex-1">
        <RecordMap
          trailPaths={trailPaths}
          track={track}
          position={last}
        />
      </div>

      <div className="shrink-0 space-y-4 border-t border-[#d8d2c4] bg-[#f3efe4] px-4 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-[#687565]">{session.trailName}</p>
            <p className="text-3xl font-semibold tracking-tight">
              {formatClock(elapsedMs(session, now))}
            </p>
          </div>
          <p className="text-xl font-semibold text-[#314936]">
            {liveDistanceMiles(session.points).toFixed(2)} mi
          </p>
        </div>

        {(error || locationError) && (
          <p className="text-sm leading-6 text-[#7a3b2e]">
            {error ?? locationError}
          </p>
        )}

        <div className="grid grid-cols-3 gap-2">
          {moments.map((moment) => (
            <button
              key={moment.id}
              type="button"
              disabled={busy}
              onClick={() => {
                void markMoment(moment.id)
              }}
              className="min-h-11 rounded-full border border-[#d8d2c4] bg-[#ebe6da] px-2 text-sm font-medium"
            >
              {moment.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {session.status === "recording" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void pauseRecording()
              }}
              className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#d8d2c4] font-medium"
            >
              <Pause size={18} />
              Pause
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void resumeRecording()
              }}
              className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#d8d2c4] font-medium"
            >
              <Play size={18} />
              Resume
            </button>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void finish()
            }}
            className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#314936] font-medium text-white disabled:opacity-40"
          >
            <Square size={16} />
            {busy ? "Saving..." : "Finish"}
          </button>
        </div>
      </div>
    </section>
  )
}

export default Record
