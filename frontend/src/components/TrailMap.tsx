import { useEffect, useRef } from "react"
import {
  Map as MapLibreMap,
  NavigationControl,
  type ExpressionSpecification,
  type GeoJSONSource,
  type MapGeoJSONFeature,
  type PointLike,
} from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"

import type { TrailMapFeature } from "../services/api"

const MAP_STYLE =
  "https://tiles.openfreemap.org/styles/liberty"

interface MapPadding {
  top: number
  right: number
  bottom: number
  left: number
}

interface TrailMapProps {
  features: TrailMapFeature[]
  selectedId?: number | null
  bounds?: [number, number, number, number] | null
  fitPadding?: MapPadding
  location?: [number, number] | null
  fitOnce?: boolean
  enableMoves?: boolean
  initialView?: {
    center: [number, number]
    zoom: number
  } | null
  onSelect?: (trailId: number | null) => void
  onBoundsChange?: (bbox: string) => void
  onViewChange?: (view: {
    center: [number, number]
    zoom: number
  }) => void
}

function locationCollection(
  location: [number, number] | null
) {
  if (!location) {
    return {
      type: "FeatureCollection" as const,
      features: [],
    }
  }

  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: location,
        },
        properties: {},
      },
    ],
  }
}

const MOUSE_HIT_RADIUS = 12
const TOUCH_HIT_RADIUS = 24

function lineWidth(
  selectedId: number | null
): ExpressionSpecification {
  return [
    "case",
    ["==", ["get", "id"], selectedId ?? -1],
    5,
    3,
  ]
}

function usesCoarsePointer() {
  return window.matchMedia("(any-pointer: coarse)").matches
}

function hitRadius() {
  return usesCoarsePointer() ? TOUCH_HIT_RADIUS : MOUSE_HIT_RADIUS
}

function hitBox(
  point: { x: number; y: number },
  radius: number
): [PointLike, PointLike] {
  return [
    [point.x - radius, point.y - radius],
    [point.x + radius, point.y + radius],
  ]
}

function pointSegmentDistance(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number }
) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSq = dx * dx + dy * dy

  if (lengthSq === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y)
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) /
        lengthSq
    )
  )

  return Math.hypot(
    point.x - (start.x + t * dx),
    point.y - (start.y + t * dy)
  )
}

function lineRings(
  geometry: MapGeoJSONFeature["geometry"]
): number[][][] {
  if (geometry.type === "LineString") {
    return [geometry.coordinates]
  }

  if (geometry.type === "MultiLineString") {
    return geometry.coordinates
  }

  return []
}

function nearestTrailId(
  map: MapLibreMap,
  point: { x: number; y: number },
  radius: number
) {
  const features = map.queryRenderedFeatures(hitBox(point, radius), {
    layers: ["trails-line"],
  })

  let bestId: number | null = null
  let bestDistance = radius

  for (const feature of features) {
    const id = Number(feature.properties?.id)

    if (!Number.isInteger(id)) {
      continue
    }

    for (const ring of lineRings(feature.geometry)) {
      for (let index = 1; index < ring.length; index += 1) {
        const start = map.project([
          ring[index - 1][0],
          ring[index - 1][1],
        ])
        const end = map.project([
          ring[index][0],
          ring[index][1],
        ])
        const distance = pointSegmentDistance(point, start, end)

        if (distance < bestDistance) {
          bestDistance = distance
          bestId = id
        }
      }
    }
  }

  return bestId
}

function TrailMap({
  features,
  selectedId = null,
  bounds = null,
  fitPadding = {
    top: 48,
    right: 48,
    bottom: 48,
    left: 48,
  },
  location = null,
  fitOnce = true,
  enableMoves = false,
  initialView = null,
  onSelect,
  onBoundsChange,
  onViewChange,
}: TrailMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const fittedKey = useRef<string | null>(null)
  const featuresRef = useRef(features)
  const selectedIdRef = useRef(selectedId)
  const locationRef = useRef(location)
  const onSelectRef = useRef(onSelect)
  const onBoundsChangeRef = useRef(onBoundsChange)
  const onViewChangeRef = useRef(onViewChange)
  const initialViewRef = useRef(initialView)
  const reportMoves = useRef(false)

  featuresRef.current = features
  selectedIdRef.current = selectedId
  locationRef.current = location
  onSelectRef.current = onSelect
  onBoundsChangeRef.current = onBoundsChange
  onViewChangeRef.current = onViewChange

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const map = new MapLibreMap({
      container,
      style: MAP_STYLE,
      center: initialViewRef.current?.center ?? [
        -122.45, 37.8,
      ],
      zoom: initialViewRef.current?.zoom ?? 9,
      clickTolerance: usesCoarsePointer() ? 16 : 3,
    })

    map.on("error", (event) => {
      console.error(
        event.error instanceof Error
          ? event.error.message
          : "Map error"
      )
    })

    map.addControl(
      new NavigationControl({
        showCompass: false,
      }),
      "top-right"
    )

    map.on("load", () => {
      map.addSource("trails", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: featuresRef.current,
        },
      })

      map.addLayer({
        id: "trails-line",
        type: "line",
        source: "trails",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": [
            "interpolate",
            ["linear"],
            ["coalesce", ["get", "score"], 50],
            35,
            "#c4b8a4",
            50,
            "#8a9184",
            65,
            "#526b4f",
            80,
            "#314936",
          ],
          "line-width": lineWidth(selectedIdRef.current),
          "line-opacity": 0.95,
        },
      })

      map.addSource("user-location", {
        type: "geojson",
        data: locationCollection(locationRef.current),
      })

      map.addLayer({
        id: "user-location",
        type: "circle",
        source: "user-location",
        paint: {
          "circle-radius": 7,
          "circle-color": "#2f6fed",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      })

      map.on("click", (event) => {
        const id = nearestTrailId(map, event.point, hitRadius())
        onSelectRef.current?.(id)
      })

      map.on("mousemove", (event) => {
        const id = nearestTrailId(map, event.point, hitRadius())
        map.getCanvas().style.cursor = id == null ? "" : "pointer"
      })
    })

    function publishView() {
      const center = map.getCenter()
      onViewChangeRef.current?.({
        center: [center.lng, center.lat],
        zoom: map.getZoom(),
      })
    }

    map.on("moveend", () => {
      publishView()

      if (!reportMoves.current) {
        return
      }

      const box = map.getBounds()

      onBoundsChangeRef.current?.(
        [
          box.getWest(),
          box.getSouth(),
          box.getEast(),
          box.getNorth(),
        ].join(",")
      )
    })

    mapRef.current = map

    return () => {
      reportMoves.current = false
      map.remove()
      mapRef.current = null
      fittedKey.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current

    if (!map?.getSource("trails")) {
      return
    }

    const source = map.getSource("trails") as GeoJSONSource

    source.setData({
      type: "FeatureCollection",
      features,
    })
  }, [features])

  useEffect(() => {
    const map = mapRef.current

    if (!map?.getLayer("trails-line")) {
      return
    }

    map.setPaintProperty(
      "trails-line",
      "line-width",
      lineWidth(selectedId)
    )
  }, [selectedId])

  useEffect(() => {
    const map = mapRef.current
    const source = map?.getSource("user-location") as
      | GeoJSONSource
      | undefined

    source?.setData(locationCollection(location))
  }, [location])

  useEffect(() => {
    const map = mapRef.current

    if (!map) {
      return
    }

    if (!bounds) {
      if (!initialViewRef.current) {
        return
      }

      const enableReporting = () => {
        reportMoves.current = enableMoves
      }

      if (map.loaded()) {
        enableReporting()
      } else {
        map.once("idle", enableReporting)
      }

      return
    }

    const key = [
      bounds.join(","),
      fitPadding.top,
      fitPadding.right,
      fitPadding.bottom,
      fitPadding.left,
    ].join(":")

    if (fitOnce && fittedKey.current === key) {
      return
    }

    fittedKey.current = key
    reportMoves.current = false

    map.fitBounds(
      [
        [bounds[0], bounds[1]],
        [bounds[2], bounds[3]],
      ],
      {
        padding: fitPadding,
        maxZoom: 14,
        duration: 0,
      }
    )

    map.once("idle", () => {
      reportMoves.current = enableMoves
    })
  }, [bounds, enableMoves, fitOnce, fitPadding])

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
    />
  )
}

export default TrailMap
