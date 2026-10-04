import { useEffect, useRef } from "react"
import {
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type ExpressionSpecification,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from "maplibre-gl"
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url"
import "maplibre-gl/dist/maplibre-gl.css"

import type { TrailMapFeature } from "../services/api"

const MAP_STYLE =
  "https://tiles.openfreemap.org/styles/liberty"

setWorkerUrl(maplibreWorkerUrl)

interface TrailMapProps {
  features: TrailMapFeature[]
  selectedId?: number | null
  bounds?: [number, number, number, number] | null
  fitOnce?: boolean
  enableMoves?: boolean
  onSelect?: (trailId: number) => void
  onBoundsChange?: (bbox: string) => void
}

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

function TrailMap({
  features,
  selectedId = null,
  bounds = null,
  fitOnce = true,
  enableMoves = false,
  onSelect,
  onBoundsChange,
}: TrailMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const fittedKey = useRef<string | null>(null)
  const featuresRef = useRef(features)
  const selectedIdRef = useRef(selectedId)
  const onSelectRef = useRef(onSelect)
  const onBoundsChangeRef = useRef(onBoundsChange)
  const reportMoves = useRef(false)

  featuresRef.current = features
  selectedIdRef.current = selectedId
  onSelectRef.current = onSelect
  onBoundsChangeRef.current = onBoundsChange

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const map = new MapLibreMap({
      container,
      style: MAP_STYLE,
      center: [-122.45, 37.8],
      zoom: 9,
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

      map.on("click", "trails-line", (event: MapLayerMouseEvent) => {
        const rawId = event.features?.[0]?.properties?.id
        const id = Number(rawId)

        if (Number.isInteger(id)) {
          onSelectRef.current?.(id)
        }
      })

      map.on("mouseenter", "trails-line", () => {
        map.getCanvas().style.cursor = "pointer"
      })

      map.on("mouseleave", "trails-line", () => {
        map.getCanvas().style.cursor = ""
      })
    })

    map.on("moveend", () => {
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

    if (!map || !bounds) {
      return
    }

    const key = bounds.join(",")

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
        padding: 48,
        maxZoom: 14,
        duration: 0,
      }
    )

    map.once("idle", () => {
      reportMoves.current = enableMoves
    })
  }, [bounds, enableMoves, fitOnce])

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
    />
  )
}

export default TrailMap
