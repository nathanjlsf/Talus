import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { Check, Mountain } from "lucide-react"

import {
  createActivity,
  getCurrentTalusUser,
  getTrails,
  type Trail,
} from "../services/api"

function AddHike() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const trailParam = searchParams.get("trail")

  const [trails, setTrails] = useState<Trail[]>([])
  const [trailId, setTrailId] = useState("")
  const [trailSearch, setTrailSearch] = useState("")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedActivityId, setSavedActivityId] = useState<number | null>(null)

  useEffect(() => {
    async function loadTrails() {
      try {
        const data = await getTrails()
        setTrails(data)

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
  }, [trailParam])

  const selectedTrail = trails.find(
    (trail) => trail.id === Number(trailId)
  )

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

      const user = await getCurrentTalusUser()

      const activity = await createActivity({
        user_id: user.id,
        trail_id: Number(trailId),
        distance_miles: selectedTrail?.distance_miles,
        elevation_gain_feet:
          selectedTrail?.elevation_gain_feet,
      })

      setSaved(true)
      setSavedActivityId(activity.id)
      setTrailId("")
      setTrailSearch("")
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
          Hiking History
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
          {selectedTrail
            ? `Log ${selectedTrail.name}`
            : "Add a hike"}
        </h1>

        <p className="mt-4 max-w-xl leading-7 text-[#687565] md:text-lg md:leading-8">
          Record a trail you've explored. You can tell Talus
          how the hike went afterward.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 rounded-3xl border border-[#d8d2c4] bg-[#ebe6da] p-5 md:mt-10 md:p-10"
      >
        {!selectedTrail && (
          <div>
            <label
              htmlFor="trail-search"
              className="text-sm font-medium text-[#314936]"
            >
              Find your trail
            </label>

            <input
              id="trail-search"
              type="search"
              value={trailSearch}
              onChange={(event) => setTrailSearch(event.target.value)}
              placeholder="Search by trail name or location..."
              className="mt-2 w-full rounded-xl border border-[#c9c4b7] bg-[#f3efe4] px-4 py-3 text-[#26352a] outline-none transition placeholder:text-[#8b8f83] focus:border-[#314936]"
            />

            <div className="mt-3">
              <select
                id="trail"
                value={trailId}
                onChange={(event) => setTrailId(event.target.value)}
                className="w-full rounded-xl border border-[#c9c4b7] bg-[#f3efe4] px-4 py-3 text-[#26352a] outline-none transition focus:border-[#314936]"
              >
                <option value="">
                  {trailSearch
                    ? "Select a matching trail..."
                    : "Select a trail..."}
                </option>

                {trails
                  .filter((trail) => {
                    const query = trailSearch.trim().toLowerCase()

                    if (!query) {
                      return true
                    }

                    return (
                      trail.name.toLowerCase().includes(query) ||
                      trail.location?.toLowerCase().includes(query)
                    )
                  })
                  .map((trail) => (
                    <option
                      key={trail.id}
                      value={trail.id}
                    >
                      {trail.name}
                      {trail.location ? ` — ${trail.location}` : ""}
                    </option>
                  ))}
              </select>
            </div>
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
                  Add your experience to help Talus learn what you enjoy.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  if (savedActivityId) {
                    navigate(
                      `/activities/${savedActivityId}/experience`
                    )
                  }
                }}
                className="min-h-11 rounded-full bg-[#314936] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#263b2b]"
              >
                Review my hike
              </button>

              <button
                type="button"
                onClick={() => {
                  navigate("/hike-dna")
                }}
                className="min-h-11 rounded-full border border-[#b9b6aa] bg-[#f3efe4] px-5 py-2.5 text-sm font-medium text-[#314936] transition hover:border-[#314936]"
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
            className="mt-6 min-h-12 w-full rounded-full bg-[#314936] px-6 py-3 font-medium text-white transition hover:bg-[#263b2b] disabled:cursor-not-allowed disabled:opacity-60 md:mt-8"
          >
            {saving ? "Saving hike..." : "Save hike"}
          </button>
        )}
      </form>
    </section>
  )
}

export default AddHike
