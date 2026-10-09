import { useEffect, useRef, useState } from "react"
import { Navigate, useNavigate } from "react-router"
import { Pause, Play, Square } from "lucide-react"

import RecordMap from "../components/RecordMap"
import {
  getTrailGeometry,
  type MomentMark,
} from "../services/api"
import {
  daylightNote,
  finishEstimate,
  guideOnTrail,
  movingEffort,
} from "../services/hikeGuidance"
import {
  getOfflinePack,
  type OfflineStyle,
} from "../services/offlinePack"
import {
  attachWatcher,
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
function formatRemaining(meters: number) {
  const miles = meters / 1609.344

  if (miles >= 0.1) {
    return `${miles.toFixed(1)} mi left`
  }

  return `${Math.round(meters * 3.28084)} ft left`
}

function formatEta(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60))

  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`
}

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

const HANDLE_HEIGHT = 72
const PEEK_SHEET = 248

type SheetStop = "closed" | "peek" | "open"

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
  const [trailPaths, setTrailPaths] = useState<number[][][]>([])
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mapStyle, setMapStyle] = useState<
    string | OfflineStyle | null
  >(null)
  const [offlineTrailId, setOfflineTrailId] = useState<
    number | null
  >(null)
  const offRouteRef = useRef(false)
  const [sheetStop, setSheetStop] = useState<SheetStop>("peek")
  const [sheetHeight, setSheetHeight] = useState<number | null>(
    null
  )
  const sheetRef = useRef<HTMLElement>(null)
  const dragRef = useRef<{
    startY: number
    startHeight: number
  } | null>(null)

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

  const trailId = session?.trailId ?? null

  useEffect(() => {
    if (trailId === null) {
      setMapStyle(null)
      setOfflineTrailId(null)
      return
    }

    let cancelled = false
    setMapStyle(null)

    void getOfflinePack(trailId)
      .then((pack) => {
        if (cancelled) {
          return
        }

        if (pack) {
          setTrailPaths(pack.paths)
          setMapStyle(pack.style)
          setOfflineTrailId(trailId)
        } else {
          setMapStyle(
            "https://tiles.openfreemap.org/styles/liberty"
          )
          setOfflineTrailId(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMapStyle(
            "https://tiles.openfreemap.org/styles/liberty"
          )
          setOfflineTrailId(null)
        }
      })

    void getTrailGeometry(trailId)
      .then((feature) => {
        if (!cancelled) {
          setTrailPaths(feature.geometry.coordinates)
        }
      })
      .catch(() => {
        if (!cancelled) {
          void getOfflinePack(trailId).then((pack) => {
            if (!cancelled && pack) {
              setTrailPaths(pack.paths)
            }
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [trailId])

  function expandedSheetHeight() {
    const parent = sheetRef.current?.parentElement

    return Math.round(
      (parent?.clientHeight ?? window.innerHeight) * 0.72
    )
  }

  function heightFor(stop: SheetStop) {
    if (stop === "closed") {
      return HANDLE_HEIGHT
    }

    if (stop === "peek") {
      return PEEK_SHEET
    }

    return expandedSheetHeight()
  }

  function stopFor(height: number): SheetStop {
    const open = expandedSheetHeight()
    const belowPeek = (HANDLE_HEIGHT + PEEK_SHEET) / 2
    const abovePeek = (PEEK_SHEET + open) / 2

    if (height < belowPeek) {
      return "closed"
    }

    if (height < abovePeek) {
      return "peek"
    }

    return "open"
  }

  function onHandlePointerDown(
    event: React.PointerEvent<HTMLButtonElement>
  ) {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      startY: event.clientY,
      startHeight:
        sheetRef.current?.getBoundingClientRect().height ??
        heightFor(sheetStop),
    }
  }

  function onHandlePointerMove(
    event: React.PointerEvent<HTMLButtonElement>
  ) {
    const drag = dragRef.current

    if (!drag) {
      return
    }

    const next =
      drag.startHeight + (drag.startY - event.clientY)

    setSheetHeight(
      Math.min(
        expandedSheetHeight(),
        Math.max(HANDLE_HEIGHT, next)
      )
    )
  }

  function onHandlePointerUp(
    event: React.PointerEvent<HTMLButtonElement>
  ) {
    const drag = dragRef.current

    if (!drag) {
      return
    }

    const next =
      drag.startHeight + (drag.startY - event.clientY)
    const moved = Math.abs(event.clientY - drag.startY) > 8

    dragRef.current = null
    setSheetHeight(null)

    if (!moved) {
      setSheetStop((current) => {
        if (current === "closed") {
          return "peek"
        }

        if (current === "peek") {
          return "open"
        }

        return "peek"
      })
      return
    }

    setSheetStop(stopFor(next))
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
    return <Navigate to="/map" replace />
  }


  const fixes = session.points.filter(
    (point) => point.moment === null
  )
  const track = fixes.map(
    (point) =>
      [point.longitude, point.latitude] as [number, number]
  )
  const lastFix = fixes[fixes.length - 1] ?? null
  const firstFix = fixes[0] ?? null
  const guidance =
    lastFix && trailPaths.length > 0
      ? guideOnTrail({
          paths: trailPaths,
          position: {
            longitude: lastFix.longitude,
            latitude: lastFix.latitude,
          },
          origin: firstFix
            ? {
                longitude: firstFix.longitude,
                latitude: firstFix.latitude,
              }
            : null,
          wasOffRoute: offRouteRef.current,
        })
      : null

  if (guidance) {
    offRouteRef.current = guidance.offRoute
  }

  let displayPosition: [number, number] | null =
    track[track.length - 1] ?? null

  if (guidance && lastFix) {
    displayPosition = guidance.offRoute
      ? [lastFix.longitude, lastFix.latitude]
      : [guidance.snapped.longitude, guidance.snapped.latitude]
  }
  const effort = movingEffort(
    fixes.map((point) => ({
      recordedAt: point.recorded_at,
      latitude: point.latitude,
      longitude: point.longitude,
      accuracy: point.accuracy,
    }))
  )
  const estimate =
    guidance === null
      ? null
      : finishEstimate({
          remainingMeters: guidance.remainingMeters,
          traveledMeters: effort.meters,
          movingSeconds: effort.movingSeconds,
          estimatedTimeMinutes:
            session.estimatedTimeMinutes ?? null,
          routeMeters: guidance.totalMeters,
        })
  const daylight =
    estimate && lastFix && estimate.seconds > 0
      ? daylightNote(
          new Date(now),
          estimate.seconds,
          lastFix.latitude,
          lastFix.longitude,
          estimate.basis
        )
      : null

  const settledSheet = heightFor(sheetStop)

  return (
    <section className="relative h-full">
      <div className="absolute inset-0">
        {mapStyle && (
          <RecordMap
            trailPaths={trailPaths}
            track={track}
            position={displayPosition}
            completed={guidance?.completed ?? []}
            offRoute={guidance?.offRoute ?? false}
            mapStyle={mapStyle}
            offlineTrailId={offlineTrailId}
            bottomInset={settledSheet}
          />
        )}
      </div>

      <section
        ref={sheetRef}
        style={{
          height: sheetHeight ?? settledSheet,
        }}
        className={`absolute inset-x-0 z-20 flex flex-col overflow-hidden rounded-t-3xl border border-[#d8d2c4] bg-[#f3efe4] shadow-[0_-8px_24px_rgba(38,58,43,0.12)] bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-4 ${
          sheetHeight === null ? "transition-[height]" : ""
        }`}
      >
        <button
          type="button"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          className="flex h-[4.5rem] w-full shrink-0 cursor-grab touch-none flex-col items-center justify-center px-4 active:cursor-grabbing"
        >
          <span className="h-1.5 w-10 rounded-full bg-[#d8d2c4]" />
          <span className="mt-2 text-sm font-medium text-[#526052]">
            {formatClock(elapsedMs(session, now))}
            {" · "}
            {liveDistanceMiles(session.points).toFixed(2)} mi
            {guidance?.offRoute ? " · Off the route" : ""}
          </span>
        </button>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-3">
        {guidance && (
          <div>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <p className="font-medium text-[#314936]">
                {Math.round(guidance.progress * 100)}% of the trail
              </p>
              <p className="text-[#687565]">
                {formatRemaining(guidance.remainingMeters)}
              </p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#d8d2c4]">
              <div
                className="h-full rounded-full bg-[#314936]"
                style={{
                  width: `${Math.min(100, Math.round(guidance.progress * 100))}%`,
                }}
              />
            </div>
            {estimate && (
              <p className="mt-2 text-sm text-[#687565]">
                {estimate.seconds <= 0
                  ? "You're at the end of the trail."
                  : estimate.basis === "pace"
                    ? `About ${formatEta(estimate.seconds)} left at your pace`
                    : `About ${formatEta(estimate.seconds)} left at this trail's usual pace`}
              </p>
            )}
            {daylight && (
              <p className="mt-1 text-sm text-[#7a3b2e]">
                {daylight}
              </p>
            )}
          </div>
        )}

        {guidance?.offRoute && (
          <p className="rounded-2xl bg-[#f3e4dc] px-4 py-3 text-sm font-medium text-[#7a3b2e]">
            You're about {Math.round(guidance.distanceOffMeters)} m
            off the route.
          </p>
        )}

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
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-[#d8d2c4] bg-[#f3efe4] px-4 pt-3 pb-3">
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
      </section>
    </section>
  )
}

export default Record
