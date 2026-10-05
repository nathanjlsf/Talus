import { setWorkerUrl } from "maplibre-gl"
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"

// Capacitor's iOS asset server has no MIME type for .mjs, so a module
// worker loaded from that file never starts and the map stays blank.
// Bundling it as a worker emits a .js file the web view will run.
setWorkerUrl(maplibreWorkerUrl)
