import { useEffect, useRef } from "react"
import {
  Map as MapLibreMap,
  setWorkerUrl,
  type GeoJSONSource,
} from "maplibre-gl"
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url"
import "maplibre-gl/dist/maplibre-gl.css"

setWorkerUrl(maplibreWorkerUrl)

const MAP_STYLE =
  "https://tiles.openfreemap.org/styles/liberty"

interface RecordMapProps {
  trailPaths: number[][][]
  track: number[][]
  position: [number, number] | null
}

function collection(
  trailPaths: number[][][],
  track: number[][],
  position: [number, number] | null
) {
  return {
    type: "FeatureCollection" as const,
    features: [
      ...trailPaths
        .filter((path) => path.length >= 2)
        .map((path) => ({
          type: "Feature" as const,
          properties: { kind: "trail" },
          geometry: {
            type: "LineString" as const,
            coordinates: path,
          },
        })),
      ...(track.length >= 2
        ? [
            {
              type: "Feature" as const,
              properties: { kind: "track" },
              geometry: {
                type: "LineString" as const,
                coordinates: track,
              },
            },
          ]
        : []),
      ...(position
        ? [
            {
              type: "Feature" as const,
              properties: { kind: "position" },
              geometry: {
                type: "Point" as const,
                coordinates: position,
              },
            },
          ]
        : []),
    ],
  }
}

function boundsFor(
  trailPaths: number[][][],
  track: number[][],
  position: [number, number] | null
): [[number, number], [number, number]] | null {
  const coordinates = [
    ...trailPaths.flat(),
    ...track,
    ...(position ? [position] : []),
  ]

  if (coordinates.length === 0) {
    return null
  }

  let west = Infinity
  let south = Infinity
  let east = -Infinity
  let north = -Infinity

  for (const coordinate of coordinates) {
    const longitude = coordinate[0]
    const latitude = coordinate[1]

    if (longitude === undefined || latitude === undefined) {
      continue
    }

    west = Math.min(west, longitude)
    east = Math.max(east, longitude)
    south = Math.min(south, latitude)
    north = Math.max(north, latitude)
  }

  if (!Number.isFinite(west)) {
    return null
  }

  return [
    [west, south],
    [east, north],
  ]
}

function RecordMap({
  trailPaths,
  track,
  position,
}: RecordMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const fittedKey = useRef("")
  const dataRef = useRef({ trailPaths, track, position })

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const map = new MapLibreMap({
      container,
      style: MAP_STYLE,
      center: [-122.45, 37.8],
      zoom: 13,
      attributionControl: false,
    })

    map.on("load", () => {
      const current = dataRef.current

      map.addSource("hike", {
        type: "geojson",
        data: collection(
          current.trailPaths,
          current.track,
          current.position
        ),
      })

      map.addLayer({
        id: "trail-line",
        type: "line",
        source: "hike",
        filter: ["==", ["get", "kind"], "trail"],
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#c4b8a4",
          "line-width": 4,
        },
      })

      map.addLayer({
        id: "track-line",
        type: "line",
        source: "hike",
        filter: ["==", ["get", "kind"], "track"],
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#314936",
          "line-width": 4,
        },
      })

      map.addLayer({
        id: "position",
        type: "circle",
        source: "hike",
        filter: ["==", ["get", "kind"], "position"],
        paint: {
          "circle-radius": 7,
          "circle-color": "#314936",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#f3efe4",
        },
      })
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    dataRef.current = { trailPaths, track, position }

    const map = mapRef.current
    const source = map?.getSource("hike") as
      | GeoJSONSource
      | undefined

    source?.setData(collection(trailPaths, track, position))

    const key =
      trailPaths.length > 0
        ? `trail:${trailPaths.length}`
        : track.length > 1
          ? "track"
          : ""
    const bounds = boundsFor(trailPaths, track, position)

    if (map && bounds && key && fittedKey.current !== key) {
      fittedKey.current = key
      map.fitBounds(bounds, {
        padding: 32,
        maxZoom: 15,
        duration: 0,
      })
    }
  }, [trailPaths, track, position])

  return <div ref={containerRef} className="h-full w-full" />
}

export default RecordMap
