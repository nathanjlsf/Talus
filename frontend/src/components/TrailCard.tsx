import { Link } from "react-router"
import { Mountain, Sparkles } from "lucide-react"

import type { RankedTrail } from "../services/api"

interface TrailCardProps {
  rankedTrail: RankedTrail
}

function TrailCard({ rankedTrail }: TrailCardProps) {
  const {
    rank,
    trail,
    score,
    explanations,
  } = rankedTrail

  const matchScore = Math.round(score)

  return (
    <Link
      to={`/trails/${trail.id}`}
      className="flex gap-4 border-b border-[#d8d2c4] py-5 transition hover:bg-[#ebe6da] md:gap-6 md:py-7"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#314936] text-base font-semibold text-white md:h-12 md:w-12 md:text-lg">
        {rank}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3 md:gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight md:text-2xl">
              {trail.name}
            </h2>

            {trail.location && (
              <p className="mt-1 text-sm text-[#687565]">
                {trail.location}
              </p>
            )}
          </div>

          <div className="shrink-0 text-right">
            <p className="text-xl font-semibold text-[#314936] md:text-2xl">
              {matchScore}%
            </p>

            <p className="text-[10px] uppercase tracking-[0.15em] text-[#8a9184] md:text-xs">
              match
            </p>
          </div>
        </div>

        {trail.description && (
          <p className="mt-3 line-clamp-3 max-w-2xl leading-7 text-[#526052] md:mt-4 md:line-clamp-none">
            {trail.description}
          </p>
        )}

        {explanations.length > 0 && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-[#ebe6da] px-4 py-3 md:mt-5">
            <Sparkles
              size={17}
              className="mt-0.5 shrink-0 text-[#314936]"
            />

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#687565]">
                Why Talus recommends it
              </p>

              <div className="mt-1 space-y-1">
                {explanations.map((explanation) => (
                  <p
                    key={explanation.attribute}
                    className="text-sm leading-6 text-[#526052]"
                  >
                    {explanation.message}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#687565] md:mt-5">
          <span className="flex items-center gap-2">
            <Mountain size={16} />
            {trail.distance_miles} mi
          </span>

          <span>
            {trail.elevation_gain_feet.toLocaleString()} ft elevation
          </span>

          <span>
            {trail.difficulty}
          </span>
        </div>

        <p className="mt-4 hidden text-sm font-medium text-[#314936] md:mt-5 md:block">
          View trail →
        </p>
      </div>
    </Link>
  )
}

export default TrailCard
