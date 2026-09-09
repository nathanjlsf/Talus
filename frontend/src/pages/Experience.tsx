import { useEffect, useState } from "react"
import {
  createExperience,
  getActivity,
  type Activity,
} from "../services/api"

function Experience() {
  const activityId = Number(
    window.location.pathname.split("/")[2]
  )

  const [activity, setActivity] =
    useState<Activity | null>(null)

  const [loading, setLoading] = useState(true)

  const [overallRating, setOverallRating] = useState(0)
  const [scenicRating, setScenicRating] = useState(0)
  const [difficultyRating, setDifficultyRating] =
    useState(0)
  const [solitudeRating, setSolitudeRating] =
    useState(0)
  const [notes, setNotes] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadActivity() {
      try {
        const data = await getActivity(activityId)
        setActivity(data)
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load your hike"
        )
      } finally {
        setLoading(false)
      }
    }

    loadActivity()
  }, [activityId])

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault()

    if (overallRating === 0) {
      setError("Please give your hike an overall rating.")
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      await createExperience({
        activity_id: activityId,
        overall_rating: overallRating,
        scenic_rating:
          scenicRating > 0 ? scenicRating : undefined,
        difficulty_rating:
          difficultyRating > 0
            ? difficultyRating
            : undefined,
        solitude_rating:
          solitudeRating > 0 ? solitudeRating : undefined,
        notes: notes.trim() || undefined,
      })

      window.location.href = "/hike-dna"
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to save your experience"
      )
    } finally {
      setSubmitting(false)
    }
  }

    if (loading) {
      return (
        <section>
            <div className="mx-auto max-w-2xl">
            <p className="text-sm text-[#687565]">
                Loading your hike...
            </p>
            </div>
        </section>
      )
    }

    if (!activity) {
      return (
        <section>
            <div className="mx-auto max-w-2xl">
            <p className="text-sm text-red-700">
                Unable to find this hike.
            </p>
            </div>
        </section>
      )
    }

    return (
      <section>
        <div className="mx-auto max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#687565]">
              After the hike
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              How did it go?
            </h1>

            <h2 className="mt-3 text-2xl font-medium">
              {activity.trail.name}
            </h2>

            {activity.trail.location && (
              <p className="mt-1 text-sm text-[#687565]">
                 {activity.trail.location}
              </p>
            )}

            <p className="mt-4 text-lg leading-8 text-[#687565]">
              Tell Talus what you thought. Your experience will help
              shape future recommendations.
            </p>

            {error && (
              <div className="mt-8 rounded-2xl border border-[#c9bfb0] bg-[#e8e3d6] p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="mt-10 space-y-8"
            >
              <RatingField
                label="Overall"
                value={overallRating}
                onChange={setOverallRating}
                required
            />

              <RatingField
                label="Scenery"
                value={scenicRating}
                onChange={setScenicRating}
            />

              <RatingField
                label="Difficulty"
                value={difficultyRating}
                onChange={setDifficultyRating}
            />

              <RatingField
                label="Solitude"
                value={solitudeRating}
                onChange={setSolitudeRating}
            />

            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium uppercase tracking-[0.15em] text-[#687565]"
              >
                  Anything else?
              </label>

              <textarea
                id="notes"
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                rows={5}
                placeholder="What stood out about this hike?"
                className="mt-3 w-full rounded-2xl border border-[#d8d2c4] bg-[#ebe6da] px-5 py-4 leading-7 outline-none transition focus:border-[#314936]"
              />
            </div>

            <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-[#314936] px-6 py-3 font-medium text-white transition hover:bg-[#263b2b] disabled:cursor-not-allowed disabled:opacity-60"
            >
                {submitting
                ? "Saving your experience..."
                : "Save my experience"}
            </button>
          </form>
        </div>
      </section>
    )
}

interface RatingFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  required?: boolean
}

function RatingField({
  label,
  value,
  onChange,
  required = false,
}: RatingFieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium uppercase tracking-[0.15em] text-[#687565]">
          {label}
          {required && (
            <span className="ml-1 text-[#314936]">*</span>
          )}
        </label>

        <span className="text-sm text-[#687565]">
          {value > 0 ? `${value}/5` : "Not rated"}
        </span>
      </div>

      <div className="mt-3 flex gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            aria-label={`${rating} out of 5`}
            className={`text-3xl transition ${
              rating <= value
                ? "text-[#314936]"
                : "text-[#c9c4b8]"
            } hover:scale-110`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  )
}

export default Experience
