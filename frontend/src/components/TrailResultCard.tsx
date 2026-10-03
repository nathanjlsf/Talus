import { Link } from "react-router"

import type { Trail } from "../services/api"

interface TrailResultCardProps {
  trail: Trail
}

function TrailResultCard({ trail }: TrailResultCardProps) {
  return (
    <Link
      to={`/trails/${trail.id}`}
      className="flex gap-4 border-b border-[#d8d2c4] py-5 transition hover:bg-[#ebe6da] md:gap-6 md:py-7"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#314936] text-white md:h-12 md:w-12">
        <span className="text-lg">↗</span>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-semibold tracking-tight md:text-2xl">
          {trail.name}
        </h3>

        {(trail.park_name || trail.location) && (
          <p className="mt-1 text-sm text-[#687565]">
            {trail.park_name ?? trail.location}
          </p>
        )}

        {trail.description && (
          <p className="mt-3 line-clamp-3 max-w-2xl leading-7 text-[#526052] md:line-clamp-none">
            {trail.description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#687565]">
          <span>{trail.distance_miles} mi</span>

          {trail.estimated_time_minutes !== null && (
            <span>
              {trail.estimated_time_minutes < 60
                ? `${trail.estimated_time_minutes} min`
                : `${Math.floor(trail.estimated_time_minutes / 60)} hr${
                    trail.estimated_time_minutes % 60
                      ? ` ${trail.estimated_time_minutes % 60} min`
                      : ""
                  }`}
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
    </Link>
  )
}

export default TrailResultCard
