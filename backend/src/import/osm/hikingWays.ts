export const CELL_DEGREES = 0.5

export function isHikingWay(
  tags: Record<string, string> | undefined
): boolean {
  if (!tags?.name?.trim()) {
    return false
  }

  const highway = tags.highway

  if (
    highway === "path" ||
    highway === "footway" ||
    highway === "foot"
  ) {
    return true
  }

  if (highway !== "track") {
    return false
  }

  return (
    tags.foot === "yes" ||
    tags.foot === "designated"
  )
}

export function isHikingRelation(
  tags: Record<string, string> | undefined
): boolean {
  if (!tags || tags.type !== "route") {
    return false
  }

  return (
    tags.route === "hiking" ||
    tags.route === "foot"
  )
}

export function cellKey(
  latitude: number,
  longitude: number
): string {
  const latitudeIndex = Math.floor(
    latitude / CELL_DEGREES
  )

  const longitudeIndex = Math.floor(
    longitude / CELL_DEGREES
  )

  return `${latitudeIndex}:${longitudeIndex}`
}

export function shouldCleanupStaleTrails(
  totalCells: number,
  completedCells: number
): boolean {
  return (
    totalCells > 0 &&
    completedCells === totalCells
  )
}
