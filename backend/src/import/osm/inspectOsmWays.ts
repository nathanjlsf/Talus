import {
  fetchBayAreaTrails,
  fetchBayAreaHikingRelations,
} from "./overpass.js"

import type {
  OsmHikingRelation,
} from "./overpass.js"

import {
  normalizeOsmWay,
} from "./normalize.js"

import {
  groupTrails,
} from "./groupTrails.js"

import {
  filterTrailGroups,
} from "./filterTrails.js"

async function inspect() {
  console.log("Fetching OSM ways...")

  const ways =
    await fetchBayAreaTrails()

  console.log(
    `Raw ways: ${ways.length}`
  )

  let relations: OsmHikingRelation[] = []

  try {
    console.log(
      "Fetching hiking relations..."
    )

    relations =
      await fetchBayAreaHikingRelations()

    console.log(
      `Hiking relations: ${relations.length}`
    )
  } catch (error) {
    console.warn(
      "Warning: hiking relations could not be fetched."
    )

    console.warn(
      error instanceof Error
        ? error.message
        : error
    )
  }

  const normalizedWays =
    ways
      .map(normalizeOsmWay)
      .filter(
        (
          trail
        ): trail is NonNullable<
          ReturnType<typeof normalizeOsmWay>
        > =>
          trail !== null
      )

  console.log(
    `Named/normalized ways: ${normalizedWays.length}`
  )

  const relationWayIds =
    new Map<number, number[]>()

  for (const relation of relations) {
    for (const member of
      relation.members ?? []) {
      if (
        member.type !== "way"
      ) {
        continue
      }

      const existing =
        relationWayIds.get(
          member.ref
        ) ?? []

      existing.push(
        relation.id
      )

      relationWayIds.set(
        member.ref,
        existing
      )
    }
  }

  const groups =
    groupTrails(
      ways,
      normalizedWays,
      relationWayIds
    )

  console.log(
    `Groups: ${groups.length}`
  )

  const candidates =
    filterTrailGroups(groups)

  console.log(
    `Rejected groups: ${
      groups.length - candidates.length
    }`
  )

  console.log(
    `Final trail candidates: ${candidates.length}`
  )

  // --------------------------------------------------
  // Candidate length distribution
  // --------------------------------------------------

  const lengthBuckets = {
    under025: 0,
    under05: 0,
    under1: 0,
    under2: 0,
    twoOrMore: 0,
  }

  for (const candidate of candidates) {
    const distance =
      candidate.distance_miles

    if (distance < 0.25) {
      lengthBuckets.under025++
    } else if (distance < 0.5) {
      lengthBuckets.under05++
    } else if (distance < 1) {
      lengthBuckets.under1++
    } else if (distance < 2) {
      lengthBuckets.under2++
    } else {
      lengthBuckets.twoOrMore++
    }
  }

  console.log("")
  console.log(
    "Candidate length distribution"
  )
  console.log(
    "-----------------------------"
  )

  console.log(
    `< 0.25 mi: ${lengthBuckets.under025}`
  )

  console.log(
    `0.25–<0.5 mi: ${lengthBuckets.under05}`
  )

  console.log(
    `0.5–<1 mi: ${lengthBuckets.under1}`
  )

  console.log(
    `1–<2 mi: ${lengthBuckets.under2}`
  )

  console.log(
    ">= 2 mi:",
    lengthBuckets.twoOrMore
  )

  // --------------------------------------------------
  // Shortest candidates
  // --------------------------------------------------

  const shortest =
    [...candidates]
      .sort(
        (a, b) =>
          a.distance_miles -
          b.distance_miles
      )
      .slice(0, 20)

  console.log("")
  console.log(
    "20 shortest candidates"
  )
  console.log(
    "----------------------"
  )

  for (const candidate of shortest) {
    console.log(
      `${candidate.distance_miles.toFixed(2)} mi — ${candidate.name}`
    )
  }

  // --------------------------------------------------
  // Duplicate names
  // --------------------------------------------------

  const nameCounts =
    new Map<string, number>()

  for (const candidate of candidates) {
    const name =
      candidate.name.trim().toLowerCase()

    nameCounts.set(
      name,
      (nameCounts.get(name) ?? 0) + 1
    )
  }

  const duplicateNames =
    [...nameCounts.entries()]
      .filter(
        ([, count]) => count > 1
      )
      .sort(
        (a, b) => b[1] - a[1]
      )

  console.log("")
  console.log(
    "Duplicate trail names"
  )
  console.log(
    "---------------------"
  )

  console.log(
    `Unique candidate names: ${nameCounts.size}`
  )

  console.log(
    `Names with multiple groups: ${duplicateNames.length}`
  )

  for (
    const [name, count]
    of duplicateNames.slice(0, 20)
  ) {
    console.log(
      `${name}: ${count}`
    )
  }

  // --------------------------------------------------
  // County coverage
  // --------------------------------------------------

  const countyCounts =
    new Map<string, number>()

  let candidatesWithCounty = 0

  for (const candidate of candidates) {
    const county =
      candidate.ways
        .map(
          (way) =>
            way.tags?.["tiger:county"]
        )
        .find(Boolean)

    if (!county) {
      continue
    }

    candidatesWithCounty++

    countyCounts.set(
      county,
      (countyCounts.get(county) ?? 0) + 1
    )
  }

  console.log("")
  console.log(
    "County coverage"
  )
  console.log(
    "---------------"
  )

  console.log(
    `Candidates with tiger:county: ${candidatesWithCounty}`
  )

  console.log(
    `Candidates without tiger:county: ${
      candidates.length -
      candidatesWithCounty
    }`
  )

  console.log("")

  for (
    const [county, count]
    of [...countyCounts.entries()]
      .sort((a, b) => b[1] - a[1])
  ) {
    console.log(
      `${county}: ${count}`
    )
  }
}

inspect().catch((error) => {
  console.error(error)
  process.exit(1)
})
