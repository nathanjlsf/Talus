import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router"

import TrailMap from "../components/TrailMap"
import {
  getCurrentTalusUser,
  getMapTrails,
  getTrail,
  type TrailMapFeature,
} from "../services/api"
import {
  beginRecording,
  getRecordingSnapshot,
  subscribeRecording,
} from "../services/recordingSession"
import { readApproximatePosition } from "../services/location"
import { trailPlace } from "../trailSummary"

const DNA_MATCH = 65
const HANDLE_HEIGHT = 56
const PEEK_SHEET = 208
const LOCATION_HALF_SPAN = 0.04

function boundsAround(
  latitude: number,
  longitude: number
): [number, number, number, number] {
  return [
    longitude - LOCATION_HALF_SPAN,
    latitude - LOCATION_HALF_SPAN,
    longitude + LOCATION_HALF_SPAN,
    latitude + LOCATION_HALF_SPAN,
  ]
}

function nearestTrailId(
  features: TrailMapFeature[],
  latitude: number,
  longitude: number
) {
  let bestId: number | null = null
  let bestDistance = Infinity
  const lngScale = Math.cos((latitude * Math.PI) / 180)

  for (const feature of features) {
    for (const line of feature.geometry.coordinates) {
      for (const [lng, lat] of line) {
        const dLat = lat - latitude
        const dLng = (lng - longitude) * lngScale
        const distance = dLat * dLat + dLng * dLng

        if (distance < bestDistance) {
          bestDistance = distance
          bestId = feature.properties.id
        }
      }
    }
  }

  return bestId
}

type SheetStop = "closed" | "peek" | "open"

function placeLabel(trail: TrailMapFeature) {
  return (
    trailPlace(trail.properties) ||
    null
  )
}

function MapPage() {
  const navigate = useNavigate()
  const [features, setFeatures] = useState<
    TrailMapFeature[]
  >([])
  const [bounds, setBounds] = useState<
    [number, number, number, number] | null
  >(null)
  const [selectedId, setSelectedId] = useState<
    number | null
  >(null)
  const [location, setLocation] = useState<
    [number, number] | null
  >(null)
  const [fitsDna, setFitsDna] = useState(false)
  const [sheetStop, setSheetStop] =
    useState<SheetStop>("peek")
  const [sheetHeight, setSheetHeight] = useState<
    number | null
  >(null)
  const [isDesktop, setIsDesktop] = useState(false)
  const sheetRef = useRef<HTMLElement>(null)
  const dragRef = useRef<{
    startY: number
    startHeight: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(
    null
  )
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(
    null
  )
  const [recordingName, setRecordingName] = useState<
    string | null
  >(() => getRecordingSnapshot().session?.trailName ?? null)

  useEffect(() => {
    return subscribeRecording(() => {
      setRecordingName(
        getRecordingSnapshot().session?.trailName ?? null
      )
    })
  }, [])

  useEffect(() => {
    let ignore = false

    async function loadMap() {
      try {
        const user = await getCurrentTalusUser()
        const position = await readApproximatePosition()

        if (ignore) {
          return
        }

        if (position) {
          const view = boundsAround(
            position.latitude,
            position.longitude
          )
          const map = await getMapTrails(
            user.id,
            view.join(",")
          )

          if (ignore) {
            return
          }

          setLocation([
            position.longitude,
            position.latitude,
          ])
          setFeatures(map.features)
          setBounds(view)
          setSelectedId(
            nearestTrailId(
              map.features,
              position.latitude,
              position.longitude
            )
          )
          return
        }

        const map = await getMapTrails(user.id)

        if (ignore) {
          return
        }

        setFeatures(map.features)
        setBounds(map.bounds)
        setSelectedId(map.features[0]?.properties.id ?? null)
      } catch (loadError) {
        if (!ignore) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Something went wrong"
          )
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadMap()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)")

    function update() {
      setIsDesktop(query.matches)
    }

    update()
    query.addEventListener("change", update)

    return () => {
      query.removeEventListener("change", update)
    }
  }, [])

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
    if (isDesktop) {
      return
    }

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

  async function loadBounds(bbox: string) {
    try {
      const user = await getCurrentTalusUser()
      const map = await getMapTrails(user.id, bbox)
      setFeatures(map.features)
      setError(null)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Something went wrong"
      )
    }
  }

  const visible = features
    .filter(
      (feature) =>
        !fitsDna ||
        feature.properties.score >= DNA_MATCH
    )
    .sort(
      (first, second) =>
        second.properties.score -
        first.properties.score
    )

  const selected =
    visible.find(
      (feature) =>
        feature.properties.id === selectedId
    ) ?? visible[0] ?? null

  async function startHike() {
    const current = getRecordingSnapshot().session

    if (current) {
      navigate("/record")
      return
    }

    if (!selected) {
      return
    }

    try {
      setStarting(true)
      setStartError(null)
      const user = await getCurrentTalusUser()
      const trail = await getTrail(selected.properties.id)
      await beginRecording({
        userId: user.id,
        trailId: trail.id,
        trailName: trail.name,
        estimatedTimeMinutes: trail.estimated_time_minutes,
      })
      navigate("/record")
    } catch (startFailure) {
      setStartError(
        startFailure instanceof Error
          ? startFailure.message
          : "Couldn't start recording"
      )
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="relative h-full">
      <TrailMap
        features={visible}
        selectedId={selected?.properties.id ?? null}
        bounds={bounds}
        location={location}
        fitPadding={
          isDesktop
            ? { top: 64, right: 420, bottom: 48, left: 48 }
            : {
                top: 72,
                right: 24,
                bottom: PEEK_SHEET + 88,
                left: 24,
              }
        }
        enableMoves={!loading}
        onSelect={(trailId) => {
          setSelectedId(trailId)
          setSheetStop("open")
        }}
        onBoundsChange={(bbox) => {
          void loadBounds(bbox)
        }}
      />

      <button
        type="button"
        onClick={() => setFitsDna((current) => !current)}
        className={`absolute left-3 top-3 z-10 min-h-11 rounded-full px-4 text-sm font-medium shadow-md ${
          fitsDna
            ? "bg-[#314936] text-white"
            : "bg-[#f3efe4] text-[#26352a]"
        }`}
      >
        Fits my DNA
      </button>

      {loading && (
        <p className="absolute left-3 top-16 z-10 rounded-full bg-[#f3efe4] px-3 py-1 text-sm text-[#687565] shadow">
          Loading trails...
        </p>
      )}

      {error && (
        <p className="absolute left-3 right-16 top-16 z-10 rounded-2xl bg-[#f3efe4] px-3 py-2 text-sm text-red-700 shadow">
          {error}
        </p>
      )}

      <section
        ref={sheetRef}
        style={
          isDesktop
            ? undefined
            : {
                height:
                  sheetHeight ?? heightFor(sheetStop),
              }
        }
        className={`absolute inset-x-0 z-20 flex flex-col overflow-hidden rounded-t-3xl border border-[#d8d2c4] bg-[#f3efe4] shadow-[0_-8px_24px_rgba(38,58,43,0.12)] ${
          sheetHeight === null ? "transition-[height]" : ""
        } bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-4 md:left-auto md:right-4 md:h-[70%] md:max-h-[70%] md:w-96`}
      >
        <button
          type="button"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          className="flex w-full shrink-0 cursor-grab touch-none flex-col items-center px-4 pb-2 pt-3 active:cursor-grabbing md:hidden"
        >
          <span className="h-1.5 w-10 rounded-full bg-[#d8d2c4]" />
          <span className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-[#687565]">
            {visible.length}{" "}
            {visible.length === 1 ? "trail" : "trails"} in view
          </span>
        </button>

        <div className="hidden shrink-0 px-4 pb-2 pt-4 md:block">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#687565]">
            {visible.length}{" "}
            {visible.length === 1 ? "trail" : "trails"} in view
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 pb-3">
          {visible.length === 0 && !loading && (
            <p className="px-2 py-3 text-sm text-[#687565]">
              No trails in this view
              {fitsDna ? " that fit your DNA" : ""}.
              Pan the map or turn the filter off.
            </p>
          )}

          {visible.map((feature) => {
            const trail = feature.properties
            const active =
              trail.id === selected?.properties.id
            const place = placeLabel(feature)
            const difficulty =
              trail.difficulty.toLowerCase() ===
              "unknown"
                ? null
                : trail.difficulty

            return (
              <article
                key={trail.id}
                className={`rounded-2xl border p-3 ${
                  active
                    ? "border-[#314936] bg-[#ebe6da]"
                    : "border-[#d8d2c4] bg-[#f8f5ed]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(trail.id)
                    setBounds(featureBounds(feature))
                  }}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">
                        {trail.name}
                      </h2>
                      <p className="mt-1 text-sm text-[#687565]">
                        {[
                          place,
                          `${trail.distance_miles.toFixed(1)} mi`,
                          difficulty,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-[#314936]">
                      {trail.score}%
                    </p>
                  </div>

                  {active && trail.reason && (
                    <p className="mt-2 text-sm leading-6 text-[#526052]">
                      {trail.reason}
                    </p>
                  )}
                </button>

                {active && (
                  <Link
                    to={`/trails/${trail.id}`}
                    className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-[#314936]"
                  >
                    View trail
                  </Link>
                )}
              </article>
            )
          })}
        </div>

        {selected && (
          <div className="shrink-0 space-y-2 border-t border-[#d8d2c4] px-3 pt-3 pb-3">
            {startError && (
              <p className="text-sm leading-6 text-[#7a3b2e]">
                {startError}
              </p>
            )}
            <button
              type="button"
              disabled={starting}
              onClick={() => {
                void startHike()
              }}
              className="flex min-h-12 w-full items-center justify-center rounded-full bg-[#314936] px-4 text-sm font-medium text-white disabled:opacity-40"
            >
              {recordingName
                ? "Open recording"
                : starting
                  ? "Starting..."
                  : "Start hike"}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

function featureBounds(
  feature: TrailMapFeature
): [number, number, number, number] {
  let west = Infinity
  let south = Infinity
  let east = -Infinity
  let north = -Infinity

  for (const line of feature.geometry.coordinates) {
    for (const [longitude, latitude] of line) {
      if (
        longitude === undefined ||
        latitude === undefined
      ) {
        continue
      }

      west = Math.min(west, longitude)
      east = Math.max(east, longitude)
      south = Math.min(south, latitude)
      north = Math.max(north, latitude)
    }
  }

  return [west, south, east, north]
}

export default MapPage
