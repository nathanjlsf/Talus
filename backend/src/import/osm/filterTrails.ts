import type { TrailGroup } from "./groupTrails.js"

export function isImportCandidate(
  group: TrailGroup
): boolean {
  if (group.distance_miles < 0.1) {
    return false
  }

  const hasRestrictedAccess =
    group.ways.some((way) => {
      const access =
        way.tags?.access?.toLowerCase()

      return (
        access === "no" ||
        access === "emergency"
      )
    })

  if (hasRestrictedAccess) {
    return false
  }

  return true
}

export function filterTrailGroups(
  groups: TrailGroup[]
): TrailGroup[] {
  return groups.filter(
    isImportCandidate
  )
}
