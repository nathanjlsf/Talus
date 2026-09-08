import type { Trail } from "../services/api"

interface TrailResultCardProps {
  trail: Trail
}

function TrailResultCard({ trail }: TrailResultCardProps) {
  return (
    <article
      onClick={() => {
        window.location.href = `/trails/${trail.id}`
      }}
      className="flex cursor-pointer gap-6 border-b border-[#d8d2c4] py-7 transition hover:bg-[#ebe6da]"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#314936] text-white">
        <span className="text-lg">↗</span>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-2xl font-semibold tracking-tight">
          {trail.name}
        </h3>

        {trail.location && (
          <p className="mt-1 text-sm text-[#687565]">
            {trail.location}
          </p>
        )}

        {trail.description && (
          <p className="mt-3 max-w-2xl leading-7 text-[#526052]">
            {trail.description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#687565]">
          <span>{trail.distance_miles} mi</span>

          {trail.estimated_time_minutes !== null && (
            <span>
              {Math.round(trail.estimated_time_minutes / 60)} hr
            </span>
          )}

          <span>
            {trail.elevation_gain_feet.toLocaleString()} ft elevation
          </span>

          <span>{trail.difficulty}</span>

          {trail.terrain && (
            <span>{trail.terrain} terrain</span>
          )}
        </div>
      </div>
    </article>
  )
}

export default TrailResultCard
