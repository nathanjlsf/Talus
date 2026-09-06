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
    <article className="flex gap-6 border-b border-[#d8d2c4] py-7">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#314936] text-lg font-semibold text-white">
        {rank}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {trail.name}
            </h2>

            {trail.location && (
              <p className="mt-1 text-sm text-[#687565]">
                {trail.location}
              </p>
            )}
          </div>

          <div className="text-right">
            <p className="text-2xl font-semibold text-[#314936]">
              {matchScore}%
            </p>

            <p className="text-xs uppercase tracking-[0.15em] text-[#8a9184]">
              personal match
            </p>
          </div>
        </div>

        {trail.description && (
          <p className="mt-4 max-w-2xl leading-7 text-[#526052]">
            {trail.description}
          </p>
        )}

        {explanations.length > 0 && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[#ebe6da] px-4 py-3">
            <Sparkles
              size={17}
              className="mt-0.5 shrink-0 text-[#314936]"
            />

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#687565]">
                Why this trail
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

        <div className="mt-5 flex flex-wrap gap-5 text-sm text-[#687565]">
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
      </div>
    </article>
  )
}

export default TrailCard
