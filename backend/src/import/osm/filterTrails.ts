import type { TrailGroup } from "./groupTrails.js"

export function isImportCandidate(
  group: TrailGroup
): boolean {
  if (group.distance_miles < 0.1) {
    return false
  }

  const hasBadTrailVisibility =
    group.ways.some((way) => {
      const visibility =
        way.tags?.trail_visibility?.toLowerCase()

      return visibility === "bad"
    })

  if (
    group.distance_miles < 0.25 &&
    hasBadTrailVisibility
  ) {
    return false
  }

  const hasRestrictedAccess =
    group.ways.some((way) => {
      const access =
        way.tags?.access?.toLowerCase()

      return (
        access === "no" ||
        access === "emergency" ||
        access === "private"
      )
    })

  if (hasRestrictedAccess) {
    return false
  }

  const name = group.name.toLowerCase()

  if (
    name.includes("7-eleven") ||
    name.includes("7 eleven") ||
    name.includes("do not enter") ||
    name.includes("not a trail") ||
    name === "dead end" ||
    name === "overgrown" ||
    name === "walking path"
  ) {
    return false
  }

  const hasMtbSpecificTag =
    group.ways.some((way) => {
      const tags = way.tags ?? {}

      return (
        tags["mtb:scale"] !== undefined ||
        tags["mtb:scale:imba"] !== undefined ||
        tags["mtb:scale:uphill"] !== undefined
      )
    })

  if (hasMtbSpecificTag) {
    return false
  }

  const hasDownhillMtbName =
    name.includes("downhill") ||
    name.endsWith(" dh") ||
    name.includes(" mtb ")

  if (hasDownhillMtbName) {
    return false
  }

  const hasNonPedestrianWay =
    group.ways.some((way) => {
      const highway =
        way.tags?.highway?.toLowerCase()

      return (
        highway === "cycleway" ||
        highway === "motorway" ||
        highway === "motorway_link" ||
        highway === "trunk" ||
        highway === "trunk_link"
      )
    })

  const hasServiceRoad =
    group.ways.some((way) => {
      const highway =
        way.tags?.highway?.toLowerCase()

      return highway === "service"
    })

  if (hasServiceRoad) {
    return false
  }

  const hasConstruction =
    group.ways.some((way) => {
      const construction =
        way.tags?.construction?.toLowerCase()

      return (
        construction !== undefined &&
        construction !== "no"
      )
    })

  if (hasConstruction) {
    return false
  }

  if (hasNonPedestrianWay) {
    return false
  }

  const hasTrack =
    group.ways.some(
      (way) =>
        way.tags?.highway?.toLowerCase() ===
        "track"
    )

  if (hasTrack) {
    const trackIsWalkable =
      group.ways.some((way) => {
        const tags = way.tags ?? {}

        return (
          tags.foot === "yes" ||
          tags.foot === "designated" ||
          tags.hiking === "yes" ||
          tags.route === "hiking" ||
          tags.sac_scale !== undefined
        )
      })

    if (!trackIsWalkable) {
      return false
    }
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
