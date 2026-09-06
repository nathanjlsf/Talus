import { useEffect, useState } from "react"
import { Mountain, TrendingUp } from "lucide-react"

import {
  getRanking,
  submitComparison,
  type RankedTrail,
} from "../services/api"

function Compare() {
  const [trails, setTrails] = useState<RankedTrail[]>([])
  const [leftTrail, setLeftTrail] = useState<RankedTrail | null>(null)
  const [rightTrail, setRightTrail] = useState<RankedTrail | null>(null)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTrails() {
      try {
        const ranking = await getRanking(1)

        setTrails(ranking)

        if (ranking.length >= 2) {
          setLeftTrail(ranking[0])
          setRightTrail(ranking[1])
        }
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

    loadTrails()
  }, [])

  async function chooseWinner(
    winner: RankedTrail,
    loser: RankedTrail
  ) {
    try {
      setSubmitting(true)
      setError(null)

      await submitComparison(
        1,
        winner.trail.id,
        loser.trail.id
      )

      const remainingTrails = trails.filter(
        (item) =>
          item.trail.id !== winner.trail.id &&
          item.trail.id !== loser.trail.id
      )

      if (remainingTrails.length > 0) {
        const nextTrail = remainingTrails[0]

        setLeftTrail(winner)
        setRightTrail(nextTrail)
      } else {
        setLeftTrail(null)
        setRightTrail(null)
      }

      setTrails((currentTrails) => {
        return currentTrails
      })
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to save comparison"
      )
    } finally {
      setSubmitting(false)
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

  if (error && !leftTrail) {
    return (
      <section>
        <p className="text-red-700">
          {error}
        </p>
      </section>
    )
  }

  if (!leftTrail || !rightTrail) {
    return (
      <section>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#687565]">
          Preference engine
        </p>

        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          You’re all caught up.
        </h1>

        <p className="mt-4 max-w-xl text-lg leading-8 text-[#687565]">
          You’ve compared all of the available trails.
          Check your rankings to see what Talus has learned.
        </p>
      </section>
    )
  }

  return (
    <section>
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#687565]">
          Preference engine
        </p>

        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          Which hike would you rather take?
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-[#687565]">
          Choose the trail you prefer. Talus will use your
          choices to learn what makes a great hike for you.
        </p>
      </div>

      {error && (
        <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-[#c9bfb0] bg-[#e8e3d6] p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <TrailChoice
          trail={leftTrail}
          disabled={submitting}
          onChoose={() =>
            chooseWinner(leftTrail, rightTrail)
          }
        />

        <TrailChoice
          trail={rightTrail}
          disabled={submitting}
          onChoose={() =>
            chooseWinner(rightTrail, leftTrail)
          }
        />
      </div>

      <p className="mt-8 text-center text-sm text-[#687565]">
        {submitting
          ? "Saving your preference..."
          : "There are no wrong answers."}
      </p>
    </section>
  )
}

interface TrailChoiceProps {
  trail: RankedTrail
  disabled: boolean
  onChoose: () => void
}

function TrailChoice({
  trail,
  disabled,
  onChoose,
}: TrailChoiceProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onChoose}
      className="group w-full rounded-3xl border border-[#d8d2c4] bg-[#ebe6da] p-8 text-left transition hover:-translate-y-1 hover:border-[#9da695] hover:bg-[#e8e3d6] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.15em] text-[#687565]">
            Trail
          </p>

          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            {trail.trail.name}
          </h2>

          {trail.trail.location && (
            <p className="mt-1 text-sm text-[#687565]">
              {trail.trail.location}
            </p>
          )}
        </div>

        <div className="rounded-full bg-[#314936] p-3 text-white transition group-hover:scale-105">
          <Mountain size={20} />
        </div>
      </div>

      {trail.trail.description && (
        <p className="mt-6 leading-7 text-[#526052]">
          {trail.trail.description}
        </p>
      )}

      <div className="mt-7 flex flex-wrap gap-4 text-sm text-[#687565]">
        <span>
          {trail.trail.distance_miles} mi
        </span>

        <span>
          {trail.trail.elevation_gain_feet.toLocaleString()} ft elevation
        </span>

        <span>
          {trail.trail.difficulty}
        </span>
      </div>

      <div className="mt-8 flex items-center gap-2 font-medium text-[#314936]">
        <TrendingUp size={17} />

        Choose this trail
      </div>
    </button>
  )
}

export default Compare