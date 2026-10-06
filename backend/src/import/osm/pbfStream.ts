import { createReadStream } from "node:fs"
import { createRequire } from "node:module"

import type { Duplex } from "node:stream"

const require = createRequire(import.meta.url)

const createOsmParser = require(
  "osm-pbf-parser"
) as () => Duplex

export interface PbfMember {
  type: string
  id: number
  role: string
}

export interface PbfItem {
  type: "node" | "way" | "relation"
  id: number
  lat?: number
  lon?: number
  tags?: Record<string, string>
  refs?: number[]
  members?: PbfMember[]
}

export async function forEachPbfBatch(
  filePath: string,
  onBatch: (items: PbfItem[]) => Promise<void>
): Promise<void> {
  const parser = createOsmParser()
  const input = createReadStream(filePath)

  await new Promise<void>((resolve, reject) => {
    let chain = Promise.resolve()
    let settled = false

    function fail(error: unknown) {
      if (settled) {
        return
      }

      settled = true
      input.destroy()
      parser.destroy()
      reject(error)
    }

    parser.on("data", (items: PbfItem[]) => {
      parser.pause()

      chain = chain
        .then(() => onBatch(items))
        .then(() => {
          if (!settled) {
            parser.resume()
          }
        })
        .catch(fail)
    })

    parser.on("end", () => {
      chain
        .then(() => {
          if (!settled) {
            settled = true
            resolve()
          }
        })
        .catch(fail)
    })

    parser.on("error", fail)
    input.on("error", fail)
    input.pipe(parser)
  })
}
