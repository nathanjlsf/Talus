import { addProtocol } from "maplibre-gl"

import { fromOfflineUrl, readCachedFile } from "./offlinePack"

let installed = false
let activeTrailId: number | null = null

export function activateOfflineTrail(trailId: number | null) {
  activeTrailId = trailId
}

export function installOfflineProtocol() {
  if (installed) {
    return
  }

  installed = true
  addProtocol("talus", async (params, abortController) => {
    const remote = fromOfflineUrl(params.url)
    const trailId = activeTrailId
    const cached =
      trailId === null
        ? null
        : await readCachedFile(trailId, remote)

    const bytes =
      cached ??
      (await (async () => {
        const response = await fetch(remote, {
          signal: abortController.signal,
        })

        if (!response.ok) {
          throw new Error(`Missing map data for ${remote}`)
        }

        return response.arrayBuffer()
      })())

    if (params.type === "json" || params.type === "string") {
      const text = new TextDecoder().decode(bytes)

      if (params.type === "json") {
        return { data: JSON.parse(text) as object }
      }

      return { data: text }
    }

    return { data: bytes }
  })
}
