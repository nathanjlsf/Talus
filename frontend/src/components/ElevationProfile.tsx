import type { ElevationSample } from "../services/api"

function ElevationProfile({
  samples,
}: {
  samples: ElevationSample[]
}) {
  const last = samples[samples.length - 1]

  if (samples.length < 2 || !last || last.distance_miles <= 0) {
    return (
      <p className="text-sm leading-6 text-[#687565]">
        Elevation isn't available for this track.
      </p>
    )
  }

  const elevations = samples.map(
    (sample) => sample.elevation_feet
  )
  const minimum = Math.min(...elevations)
  const maximum = Math.max(...elevations)
  const span = Math.max(maximum - minimum, 1)
  const width = 320
  const height = 112
  const coordinates = samples
    .map((sample) => {
      const x =
        (sample.distance_miles / last.distance_miles) * width
      const y =
        height -
        ((sample.elevation_feet - minimum) / span) *
          (height - 12) -
        6

      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-28 w-full"
        role="img"
        aria-label="Elevation profile"
      >
        <polyline
          points={coordinates}
          fill="none"
          stroke="#314936"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>

      <div className="mt-2 flex justify-between text-xs text-[#687565]">
        <span>{Math.round(minimum).toLocaleString()} ft</span>
        <span>{Math.round(maximum).toLocaleString()} ft</span>
      </div>
    </div>
  )
}

export default ElevationProfile
