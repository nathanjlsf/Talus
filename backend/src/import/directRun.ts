import path from "node:path"
import { pathToFileURL } from "node:url"

export function isDirectRun(
  moduleUrl: string
): boolean {
  const entry = process.argv[1]

  if (!entry) {
    return false
  }

  return (
    moduleUrl ===
    pathToFileURL(path.resolve(entry)).href
  )
}
