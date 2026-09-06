import { useEffect, useState } from "react"
import { ArrowLeft, Mountain, Sparkles } from "lucide-react"

import {
  getTrail,
  getRanking,
  type RankedTrail,
} from "../services/api"

function TrailDetail() {
  const [trail, setTrail] = useState<RankedTrail["trail"] | null>(null)
  const [recommendation, setRecommendation] =
    useState<RankedTrail | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTrail() {
      try {
        const trailId = Number(
          window.location.pathname.split("/").pop()
        )

        if (!trailId) {
          throw new Error("Invalid trail")
        }

        const [trailData, ranking] = await Promise.all([
          getTrail(trailId),
          getRanking(1),
        ])

        setTrail(trailData)

        const rankedTrail = ranking.find(
          (item) => item.trail.id === trailId
        )

        setRecommendation(rankedTrail ?? null)
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Something went wrong"
        )
      } finally {
        setLoading(false)
      }
    }

    loadTrail()
  }, [])

  if (loading) {
    return (
      <section>
        <p className="text-[#687565]">
          Loading trail...
        </p>
      </section>
    )
  }

  if (error || !trail) {
    return (
      <section>
        <p className="text-red-700">
          {error ?? "Trail not found"}
        </p>
      </section>
    )
  }

  const matchScore = recommendation
    ? Math.round(recommendation.score)
    : null

  return (
    <section>
      <button
        type="button"
        onClick={() => {
          window.location.href = "/"
        }}
        className="flex items-center gap-2 text-sm font-medium text-[#687565] transition hover:text-[#26352a]"
      >
        <ArrowLeft size={16} />
        Back to recommendations
      </button>

      <div className="mt-8 max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#687565]">
          Trail
        </p>

        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          {trail.name}
        </h1>

        {trail.location && (
          <p className="mt-2 text-lg text-[#687565]">
            {trail.location}
          </p>
        )}
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <div className="rounded-2xl border border-[#d8d2c4] bg-[#ebe6da] p-5">
          <p className="text-xs uppercase tracking-[0.15em] text-[#8a9184]">
            Distance
          </p>

          <p className="mt-2 text-2xl font-semibold">
            {trail.distance_miles} mi
          </p>
        </div>

        <div className="rounded-2xl border border-[#d8d2c4] bg-[#ebe6da] p-5">
          <p className="text-xs uppercase tracking-[0.15em] text-[#8a9184]">
            Elevation
          </p>

          <p className="mt-2 text-2xl font-semibold">
            {trail.elevation_gain_feet.toLocaleString()} ft
          </p>
        </div>

        <div className="rounded-2xl border border-[#d8d2c4] bg-[#ebe6da] p-5">
          <p className="text-xs uppercase tracking-[0.15em] text-[#8a9184]">
            Difficulty
          </p>

          <p className="mt-2 text-2xl font-semibold">
            {trail.difficulty}
          </p>
        </div>
      </div>

      {trail.description && (
        <div className="mt-10 max-w-3xl">
          <h2 className="text-2xl font-semibold">
            About this trail
          </h2>

          <p className="mt-4 text-lg leading-8 text-[#526052]">
            {trail.description}
          </p>
        </div>
      )}

      {recommendation && (
        <div className="mt-10 max-w-3xl rounded-3xl border border-[#d8d2c4] bg-[#ebe6da] p-7">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-[#314936] p-3 text-white">
              <Sparkles size={19} />
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#687565]">
                Personal recommendation
              </p>

              <p className="mt-1 text-3xl font-semibold text-[#314936]">
                {matchScore}% match
              </p>
            </div>
          </div>

          {recommendation.explanations.length > 0 && (
            <div className="mt-6 border-t border-[#d8d2c4] pt-5">
              <p className="text-sm font-medium uppercase tracking-[0.15em] text-[#687565]">
                Why Talus recommends it
              </p>

              <div className="mt-3 space-y-2">
                {recommendation.explanations.map(
                  (explanation) => (
                    <p
                      key={explanation.attribute}
                      className="leading-7 text-[#526052]"
                    >
                      {explanation.message}
                    </p>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-10 flex items-center gap-3 rounded-3xl border border-dashed border-[#c9bfb0] bg-[#f0ece2] p-7">
        <Mountain
          size={24}
          className="shrink-0 text-[#687565]"
        />

        <div>
          <h2 className="font-semibold">
            Start a hike
          </h2>

          <p className="mt-1 text-sm leading-6 text-[#687565]">
            GPS tracking and activity recording will be
            available here in V2.
          </p>
        </div>
      </div>
    </section>
  )
}

export default TrailDetail