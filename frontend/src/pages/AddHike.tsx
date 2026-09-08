import { useEffect, useState } from "react"
import type { SubmitEvent } from "react"
import { Check, Mountain } from "lucide-react"

import {
  createActivity,
  createExperience,
  getTrails,
  type Trail,
} from "../services/api"

function AddHike() {
  const [trails, setTrails] = useState<Trail[]>([])
  const [trailId, setTrailId] = useState("")

  const [overallRating, setOverallRating] = useState(0)
  const [scenicRating, setScenicRating] = useState(0)
  const [difficultyRating, setDifficultyRating] = useState(0)
  const [solitudeRating, setSolitudeRating] = useState(0)
  const [notes, setNotes] = useState("")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTrails() {
      try {
        const data = await getTrails()
        setTrails(data)

        const params = new URLSearchParams(
          window.location.search
        )

        const trailParam = params.get("trail")

        if (trailParam) {
          const trailIdFromUrl = Number(trailParam)

          const trailExists = data.some(
            (trail) => trail.id === trailIdFromUrl
          )

          if (trailExists) {
            setTrailId(trailParam)
          }
        }
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load trails"
        )
      } finally {
        setLoading(false)
      }
    }

    loadTrails()
  }, [])

  const selectedTrail = trails.find(
    (trail) => trail.id === Number(trailId)
  )

  const isContextual = Boolean(selectedTrail)

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault()

    if (!trailId) {
      setError("Please select a trail")
      return
    }

    if (overallRating === 0) {
      setError("Please provide an overall rating")
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSaved(false)

      const activity = await createActivity({
        user_id: 1,
        trail_id: Number(trailId),
        distance_miles: selectedTrail?.distance_miles,
        elevation_gain_feet:
          selectedTrail?.elevation_gain_feet,
      })

      await createExperience({
        activity_id: activity.id,
        overall_rating: overallRating,
        scenic_rating:
          scenicRating || undefined,
        difficulty_rating:
          difficultyRating || undefined,
        solitude_rating:
          solitudeRating || undefined,
        notes: notes || undefined,
      })

      setSaved(true)

      setTrailId("")
      setOverallRating(0)
      setScenicRating(0)
      setDifficultyRating(0)
      setSolitudeRating(0)
      setNotes("")
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to save hike"
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section>
        <p className="text-[#687565]">
          Loading trails...
        </p>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-3xl">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#687565]">
          {isContextual ? "Hiking reflection" : "Hiking history"}
        </p>

        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          {selectedTrail
            ? `How was ${selectedTrail.name}?`
            : "Add a hike"}
        </h1>

        <p className="mt-4 max-w-xl text-lg leading-8 text-[#687565]">
          {selectedTrail
            ? "Tell Talus what you noticed. Your feedback helps it understand what makes a great hike for you."
            : "Tell Talus about a trail you've experienced. Your feedback helps improve future recommendations."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-10 rounded-3xl border border-[#d8d2c4] bg-[#ebe6da] p-8 md:p-10"
      >
        {!selectedTrail && (
          <div>
            <label
              htmlFor="trail"
              className="text-sm font-medium text-[#314936]"
            >
              Trail
            </label>

            <select
              id="trail"
              value={trailId}
              onChange={(event) =>
                setTrailId(event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-[#c9c4b7] bg-[#f3efe4] px-4 py-3 text-[#26352a] outline-none transition focus:border-[#314936]"
            >
              <option value="">
                Select a trail...
              </option>

              {trails.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedTrail && (
          <div className="rounded-2xl bg-[#e1dccf] p-5">
            <div className="flex items-start gap-3">
              <Mountain
                size={20}
                className="mt-0.5 shrink-0 text-[#314936]"
              />

              <div>
                <p className="font-medium">
                  {selectedTrail.name}
                </p>

                <p className="mt-1 text-sm text-[#687565]">
                  {selectedTrail.distance_miles} mi ·{" "}
                  {selectedTrail.elevation_gain_feet.toLocaleString()}{" "}
                  ft elevation ·{" "}
                  {selectedTrail.difficulty}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-10">
          <div>
            <h2 className="text-xl font-semibold">
              How was the hike overall?
            </h2>

            <p className="mt-1 text-sm text-[#687565]">
              Your overall experience is the most important signal.
            </p>
          </div>

          <div className="mt-5">
            <Rating
              label="Overall"
              value={overallRating}
              onChange={setOverallRating}
              required
            />
          </div>
        </div>

        <div className="mt-10 border-t border-[#d8d2c4] pt-8">
          <h2 className="text-xl font-semibold">
            What stood out?
          </h2>

          <p className="mt-1 text-sm text-[#687565]">
            These details help Talus understand your preferences.
          </p>

          <div className="mt-6 grid gap-8 md:grid-cols-3">
            <Rating
              label="Scenery"
              value={scenicRating}
              onChange={setScenicRating}
            />

            <Rating
              label="Difficulty"
              value={difficultyRating}
              onChange={setDifficultyRating}
            />

            <Rating
              label="Solitude"
              value={solitudeRating}
              onChange={setSolitudeRating}
            />
          </div>
        </div>

        <div className="mt-10 border-t border-[#d8d2c4] pt-8">
          <label
            htmlFor="notes"
            className="text-xl font-semibold"
          >
            Anything else?
          </label>

          <p className="mt-1 text-sm text-[#687565]">
            A few words about what you enjoyed—or didn't.
          </p>

          <textarea
            id="notes"
            value={notes}
            onChange={(event) =>
              setNotes(event.target.value)
            }
            placeholder="What stood out about this hike?"
            rows={5}
            className="mt-4 w-full resize-none rounded-xl border border-[#c9c4b7] bg-[#f3efe4] px-4 py-3 text-[#26352a] outline-none placeholder:text-[#8b8f83] focus:border-[#314936]"
          />
        </div>

        {error && (
          <div className="mt-6 rounded-xl bg-[#e6d8d1] px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {saved && (
          <div className="mt-6 flex items-center gap-2 rounded-xl bg-[#dce4d9] px-4 py-3 text-sm text-[#314936]">
            <Check size={17} />
            Hike saved successfully.
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-8 w-full rounded-full bg-[#314936] px-6 py-3 font-medium text-white transition hover:bg-[#263b2b] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving hike..." : "Save hike"}
        </button>
      </form>
    </section>
  )
}

interface RatingProps {
  label: string
  value: number
  onChange: (value: number) => void
  required?: boolean
}

function Rating({
  label,
  value,
  onChange,
  required = false,
}: RatingProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[#314936]">
          {label}
          {required && (
            <span className="ml-1 text-[#687565]">
              *
            </span>
          )}
        </label>

        {value > 0 && (
          <span className="text-sm text-[#687565]">
            {value}/5
          </span>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            aria-label={`${rating} out of 5`}
            className={`h-9 w-9 rounded-full border text-sm font-medium transition ${
              rating <= value
                ? "border-[#314936] bg-[#314936] text-white"
                : "border-[#b9b6aa] bg-[#f3efe4] text-[#687565] hover:border-[#314936]"
            }`}
          >
            {rating}
          </button>
        ))}
      </div>
    </div>
  )
}

export default AddHike
