import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { ArrowRight, Star } from "lucide-react"

import {
  createActivity,
  createExperience,
  getCurrentTalusUser,
  getTrail,
  type Trail,
} from "../services/api"

function OnboardingExperiences() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const trailIds = searchParams.get("trails") || ""

  const [trails, setTrails] = useState<Trail[]>([])
  const [ratings, setRatings] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadTrails() {
      if (!trailIds) {
        setLoading(false)
        return
      }

      const ids = trailIds
        .split(",")
        .map(Number)
        .filter((id) => !Number.isNaN(id))

      try {
        const results = await Promise.all(
          ids.map((id) => getTrail(id))
        )
        
        setTrails(results)
      } finally {
        setLoading(false)
      }
    }

    loadTrails()
  }, [trailIds])

  function setRating(trailId: number, rating: number) {
    setRatings((current) => ({
      ...current,
      [trailId]: rating,
    }))
  }

  async function continueToNextStep() {
    if (!allRated || saving) {
      return
    }

    setSaving(true)

    try {
      for (const trail of trails) {
        const user = await getCurrentTalusUser()

        const activity =
          await createActivity({
            user_id: user.id,
            trail_id: trail.id,
          })

        await createExperience({
          activity_id: activity.id,
          overall_rating: ratings[trail.id],
        })
      }

      navigate("/compare?experience=experienced")
    } finally {
      setSaving(false)
    }
  }

  const allRated =
    trails.length > 0 &&
    trails.every((trail) => ratings[trail.id] !== undefined)

  return (
    <div className="mx-auto max-w-3xl">
      <div className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-[#687565]">
          Your hiking history
        </p>

        <h1 className="mt-3 text-3xl font-semibold text-[#263a2b] md:text-4xl">
          How were these hikes?
        </h1>

        <p className="mt-4 leading-7 text-[#687565]">
          Think about the overall experience. There’s no right answer—this
          simply helps Talus understand what you enjoy.
        </p>
      </div>

      <div className="mt-10 space-y-5">
        {loading ? (
          <p className="text-[#687565]">Loading your hikes...</p>
        ) : trails.length === 0 ? (
          <div className="rounded-2xl border border-[#d8d2c4] bg-[#ebe6da] p-6">
            <p className="text-[#687565]">
              No past hikes selected. That's okay—we'll learn your preferences
              through comparisons.
            </p>
          </div>
        ) : (
          trails.map((trail) => {
            const rating = ratings[trail.id]

            return (
              <div
                key={trail.id}
                className="rounded-2xl border border-[#d8d2c4] bg-[#f8f5ed] p-5 md:p-6"
              >
                <h2 className="text-xl font-semibold text-[#263a2b]">
                  {trail.name}
                </h2>

                <p className="mt-2 text-sm text-[#687565]">
                  {trail.location || "Location unknown"} ·{" "}
                  {trail.distance_miles.toFixed(1)} mi · {trail.difficulty}
                </p>

                <div className="mt-6">
                  <p className="text-sm font-medium text-[#263a2b]">
                    Overall, how much did you enjoy it?
                  </p>

                  <div className="mt-3 flex gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(trail.id, value)}
                        aria-label={`${value} out of 5`}
                        className={`flex h-11 w-11 items-center justify-center rounded-xl border transition ${
                          rating !== undefined && value <= rating
                            ? "border-[#314936] bg-[#314936] text-white"
                            : "border-[#d8d2c4] bg-[#ebe6da] text-[#687565] hover:border-[#314936]"
                        }`}
                      >
                        <Star
                          size={18}
                          fill={
                            rating !== undefined && value <= rating
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>
                    ))}
                  </div>

                  {rating !== undefined && (
                    <p className="mt-2 text-sm text-[#687565]">
                      {rating} out of 5
                    </p>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-4 mt-10 flex justify-end border-t border-[#d8d2c4] bg-[#f4f0e6] px-4 py-3 md:static md:mx-0 md:bg-transparent md:px-0 md:pt-6 md:pb-0">
        <button
          onClick={continueToNextStep}
          disabled={saving || trails.length > 0 && !allRated}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl md:w-auto bg-[#314936] px-5 py-3 font-medium text-white transition hover:bg-[#263a2b] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Saving..." : "Continue"}
          <ArrowRight size={17} />
        </button>
      </div>
    </div>
  )
}

export default OnboardingExperiences
