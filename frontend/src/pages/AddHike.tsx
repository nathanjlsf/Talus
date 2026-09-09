import { useEffect, useState } from "react"
import { Check, Mountain } from "lucide-react"

import {
  createActivity,
  getTrails,
  type Trail,
} from "../services/api"

function AddHike() {
  const [trails, setTrails] = useState<Trail[]>([])
  const [trailId, setTrailId] = useState("")

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

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (!trailId) {
      setError("Please select a trail")
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSaved(false)

      await createActivity({
        user_id: 1,
        trail_id: Number(trailId),
        distance_miles: selectedTrail?.distance_miles,
        elevation_gain_feet:
          selectedTrail?.elevation_gain_feet,
      })

      setSaved(true)
      setTrailId("")
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
          {isContextual ? "Hiking history" : "Hiking history"}
        </p>

        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          {selectedTrail
            ? `Log ${selectedTrail.name}`
            : "Add a hike"}
        </h1>

        <p className="mt-4 max-w-xl text-lg leading-8 text-[#687565]">
          Record a trail you've explored. You can tell Talus
          how the hike went afterward.
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

              {trails.map((trail) => (
                <option
                  key={trail.id}
                  value={trail.id}
                >
                  {trail.name}
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

                {selectedTrail.location && (
                  <p className="mt-1 text-sm text-[#687565]">
                    {selectedTrail.location}
                  </p>
                )}

                <p className="mt-2 text-sm text-[#687565]">
                  {selectedTrail.distance_miles} mi ·{" "}
                  {selectedTrail.elevation_gain_feet.toLocaleString()}{" "}
                  ft elevation · {selectedTrail.difficulty}
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl bg-[#e6d8d1] px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {saved && (
          <div className="mt-6 rounded-2xl border border-[#c9d3c5] bg-[#dce4d9] p-5">
            <div className="flex items-start gap-3">
              <Check
                size={20}
                className="mt-0.5 shrink-0 text-[#314936]"
              />

              <div>
                <p className="font-medium text-[#314936]">
                  Your hike is saved.
                </p>

                <p className="mt-1 text-sm leading-6 text-[#526052]">
                  You can tell Talus how it went from your hike
                  history.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/activities"
                }}
                className="rounded-full bg-[#314936] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#263b2b]"
              >
                Review my hike
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.href = "/hike-dna"
                }}
                className="rounded-full border border-[#b9b6aa] bg-[#f3efe4] px-5 py-2.5 text-sm font-medium text-[#314936] transition hover:border-[#314936]"
              >
                See my Hike DNA
              </button>
            </div>
          </div>
        )}

        {!saved && (
          <button
            type="submit"
            disabled={saving}
            className="mt-8 w-full rounded-full bg-[#314936] px-6 py-3 font-medium text-white transition hover:bg-[#263b2b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving hike..." : "Save hike"}
          </button>
        )}
      </form>
    </section>
  )
}

export default AddHike
