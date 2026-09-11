const USGS_ELEVATION_URL =
  "https://epqs.nationalmap.gov/v1/json"

export interface ElevationPoint {
  latitude: number
  longitude: number
  elevation_feet: number
}

export async function getElevation(
  latitude: number,
  longitude: number
): Promise<number> {
  const url = new URL(
    USGS_ELEVATION_URL
  )

  url.searchParams.set(
    "x",
    longitude.toString()
  )

  url.searchParams.set(
    "y",
    latitude.toString()
  )

  url.searchParams.set(
    "units",
    "Feet"
  )

  url.searchParams.set(
    "output",
    "json"
  )

  const response = await fetch(
    url.toString(),
    {
      headers: {
        "User-Agent":
          "Talus/1.0 (hiking trail data importer)",
      },
    }
  )

  if (!response.ok) {
    throw new Error(
      `USGS elevation request failed: ${response.status} ${response.statusText}`
    )
  }

  const data =
    (await response.json()) as {
      value?: number | string
    }

  const elevation =
    Number(data.value)

  if (!Number.isFinite(elevation)) {
    throw new Error(
      `Invalid elevation returned by USGS: ${data.value}`
    )
  }

  return elevation
}
