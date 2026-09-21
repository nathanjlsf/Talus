import { useEffect, useState } from "react"
import { ArrowRight, Check, Search } from "lucide-react"

import { getTrails, type Trail } from "../services/api"

function PastHikes() {
  const [trails, setTrails] = useState<Trail[]>([])
  const [selectedTrails, setSelectedTrails] = useState<Trail[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTrails() {
      try {
        const results = await getTrails({ search })
        setTrails(results)
      } finally {
        setLoading(false)
      }
    }

    loadTrails()
  }, [search])

  function toggleTrail(trail: Trail) {
    setSelectedTrails((current) => {
      const alreadySelected = current.some((item) => item.id === trail.id)

      if (alreadySelected) {
        return current.filter((item) => item.id !== trail.id)
      }

      return [...current, trail]
    })
  }

  function continueToNextStep() {
    const trailIds = selectedTrails.map((trail) => trail.id).join(",")

    window.location.href = `/onboarding/experiences?trails=${trailIds}`
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-[#687565]">
          Your hiking history
        </p>

        <h1 className="mt-3 text-4xl font-semibold text-[#263a2b]">
          Which hikes have you done?
        </h1>

        <p className="mt-4 leading-7 text-[#687565]">
          Add any hikes you remember. There’s no minimum—one hike is useful,
          and you can add more if you want.
        </p>
      </div>

      <div className="relative mt-8">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[#687565]"
        />

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search for a hike..."
          className="w-full rounded-xl border border-[#d8d2c4] bg-[#f8f5ed] py-3 pl-11 pr-4 outline-none transition focus:border-[#687565]"
        />
      </div>

      {selectedTrails.length > 0 && (
        <div className="mt-6 rounded-2xl border border-[#d8d2c4] bg-[#ebe6da] p-5">
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-[#687565]">
            Selected
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {selectedTrails.map((trail) => (
              <span
                key={trail.id}
                className="rounded-full bg-[#314936] px-3 py-1.5 text-sm text-white"
              >
                {trail.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 space-y-3">
        {loading ? (
          <p className="text-[#687565]">Finding hikes...</p>
        ) : trails.length === 0 ? (
          <p className="text-[#687565]">
            No hikes found. Try a different search.
          </p>
        ) : (
          trails.map((trail) => {
            const selected = selectedTrails.some(
              (item) => item.id === trail.id,
            )

            return (
              <button
                key={trail.id}
                onClick={() => toggleTrail(trail)}
                className={`flex w-full items-center justify-between rounded-2xl border p-5 text-left transition ${
                  selected
                    ? "border-[#314936] bg-[#ebe6da]"
                    : "border-[#d8d2c4] bg-[#f8f5ed] hover:border-[#687565]"
                }`}
              >
                <div>
                  <h2 className="font-semibold text-[#263a2b]">
                    {trail.name}
                  </h2>

                  <p className="mt-1 text-sm text-[#687565]">
                    {trail.location || "Location unknown"} ·{" "}
                    {trail.distance_miles.toFixed(1)} mi ·{" "}
                    {trail.difficulty}
                  </p>
                </div>

                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                    selected
                      ? "border-[#314936] bg-[#314936] text-white"
                      : "border-[#c9c2b4] text-transparent"
                  }`}
                >
                  <Check size={17} />
                </div>
              </button>
            )
          })
        )}
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-[#d8d2c4] pt-6">
        <button
          onClick={continueToNextStep}
          className="text-sm font-medium text-[#687565] hover:text-[#314936]"
        >
          I don't remember any
        </button>

        <button
          onClick={continueToNextStep}
          className="inline-flex items-center gap-2 rounded-xl bg-[#314936] px-5 py-3 font-medium text-white transition hover:bg-[#263a2b]"
        >
          Continue
          <ArrowRight size={17} />
        </button>
      </div>
    </div>
  )
}

export default PastHikes
