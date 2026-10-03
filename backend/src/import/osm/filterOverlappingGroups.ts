import type { TrailGroup } from "./groupTrails.js"

function normalizeName(
  name: string
): string {
  return name
    .trim()
    .toLowerCase()
}

function getWayIdSet(
  group: TrailGroup
): Set<number> {
  return new Set(
    group.ways.map(
      (way) => way.id
    )
  )
}

function isStrictSubset(
  smaller: Set<number>,
  larger: Set<number>
): boolean {
  if (
    smaller.size >= larger.size
  ) {
    return false
  }

  for (const wayId of smaller) {
    if (!larger.has(wayId)) {
      return false
    }
  }

  return true
}

export function filterOverlappingGroups(
  groups: TrailGroup[]
): TrailGroup[] {
  const result: TrailGroup[] = []

  for (const group of groups) {
    const groupName =
      normalizeName(group.name)

    const groupWayIds =
      getWayIdSet(group)

    const hasLargerSameNameGroup =
      groups.some((other) => {
        if (
          other === group
        ) {
          return false
        }

        if (
          normalizeName(other.name) !==
          groupName
        ) {
          return false
        }

        const otherWayIds =
          getWayIdSet(other)

        return isStrictSubset(
          groupWayIds,
          otherWayIds
        )
      })

    if (
      hasLargerSameNameGroup
    ) {
      continue
    }

    result.push(group)
  }

  return result
}
