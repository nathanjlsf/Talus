import db from "../db/database.js"

export interface ElevationCacheEntry {
  latitude: number
  longitude: number
  elevation_feet: number
}

function coordinateKey(
  latitude: number,
  longitude: number
): string {
  return `${latitude.toFixed(6)},${longitude.toFixed(6)}`
}

export function getCachedElevations(
  points: Array<{
    latitude: number
    longitude: number
  }>
): Map<string, number> {
  if (points.length === 0) {
    return new Map()
  }

  const uniqueKeys = new Set(
    points.map((point) =>
      coordinateKey(
        point.latitude,
        point.longitude
      )
    )
  )

  const cached = new Map<string, number>()

  const statement = db.prepare(`
    SELECT
      latitude,
      longitude,
      elevation_feet
    FROM elevation_cache
    WHERE latitude = ?
      AND longitude = ?
  `)

  for (const point of points) {
    const key = coordinateKey(
      point.latitude,
      point.longitude
    )

    if (!uniqueKeys.has(key)) {
      continue
    }

    const row = statement.get(
      Number(point.latitude.toFixed(6)),
      Number(point.longitude.toFixed(6))
    ) as
      | ElevationCacheEntry
      | undefined

    if (row) {
      cached.set(
        key,
        row.elevation_feet
      )
    }
  }

  return cached
}

export function saveElevation(
  latitude: number,
  longitude: number,
  elevationFeet: number
): void {
  db.prepare(`
    INSERT INTO elevation_cache (
      latitude,
      longitude,
      elevation_feet
    )
    VALUES (?, ?, ?)
    ON CONFLICT(latitude, longitude)
    DO UPDATE SET
      elevation_feet = excluded.elevation_feet
  `).run(
    Number(latitude.toFixed(6)),
    Number(longitude.toFixed(6)),
    elevationFeet
  )
}

export function saveElevations(
  entries: ElevationCacheEntry[]
): void {
  if (entries.length === 0) {
    return
  }

  const statement = db.prepare(`
    INSERT INTO elevation_cache (
      latitude,
      longitude,
      elevation_feet
    )
    VALUES (?, ?, ?)
    ON CONFLICT(latitude, longitude)
    DO UPDATE SET
      elevation_feet = excluded.elevation_feet
  `)

  const save = db.transaction(() => {
    for (const entry of entries) {
      statement.run(
        Number(
          entry.latitude.toFixed(6)
        ),
        Number(
          entry.longitude.toFixed(6)
        ),
        entry.elevation_feet
      )
    }
  })

  save()
}
