import { useEffect, useState } from "react"
import { Mountain, TrendingUp } from "lucide-react"

import {
  getNextComparison,
  submitComparison,
  type RankedTrail,
} from "../services/api"

const INITIAL_COMPARISONS = 5

function Compare() {
  const [leftTrail, setLeftTrail] =
    useState<RankedTrail | null>(null)

  const [rightTrail, setRightTrail] =
    useState<RankedTrail | null>(null)

  const [comparisonCount, setComparisonCount] =
    useState(0)

  const [loading, setLoading] =
    useState(true)

  const [submitting, setSubmitting] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)

  const params =
    new URLSearchParams(window.location.search)

  const experienceType =
    params.get("experience")

  const isNewHiker =
    experienceType === "new"

  const isExperiencedHiker =
    experienceType === "experienced"

  useEffect(() => {
    async function loadComparison() {
      try {
        const comparison =
          await getNextComparison(1)

        setLeftTrail({
          rank: 0,
          trail: comparison.firstTrail,
          score: 0,
          explanations: [],
        })

        setRightTrail({
          rank: 0,
          trail: comparison.secondTrail,
          score: 0,
          explanations: [],
        })
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

    loadComparison()
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

      const nextComparisonCount =
        comparisonCount + 1

      setComparisonCount(
        nextComparisonCount
      )

      if (
        nextComparisonCount >=
        INITIAL_COMPARISONS
      ) {
        setLeftTrail(null)
        setRightTrail(null)
        return
      }

      const comparison =
        await getNextComparison(1)

      setLeftTrail({
        rank: 0,
        trail: comparison.firstTrail,
        score: 0,
        explanations: [],
      })

      setRightTrail({
        rank: 0,
        trail: comparison.secondTrail,
        score: 0,
        explanations: [],
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
          Learning what you like...
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
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#687565]">
            {isNewHiker
              ? "Your first hike"
              : "Preference engine"}
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            {isNewHiker
              ? "Your first hiking style is taking shape."
              : "Your hiking style is taking shape."}
          </h1>

          <p className="mt-4 text-lg leading-8 text-[#687565]">
            {isNewHiker
              ? "Talus has a better idea of what sounds appealing to you. Let's use that to find a great first hike."
              : "Talus has learned a little more about what you like. Keep exploring to make your recommendations even better."}
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/hike-dna"
              }}
              className="rounded-full bg-[#314936] px-6 py-3 font-medium text-white transition hover:bg-[#263b2b]"
            >
              See my Hike DNA
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/trails"
              }}
              className="rounded-full border border-[#b9b6aa] bg-[#f3efe4] px-6 py-3 font-medium text-[#314936] transition hover:border-[#314936]"
            >
              Discover trails
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#687565]">
          {isNewHiker
            ? "Finding your first hike"
            : isExperiencedHiker
              ? "Let's get to know your hiking style"
              : "Preference engine"}
        </p>

        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          {isNewHiker
            ? "What sounds like a good first hike?"
            : "Which hike would you rather take?"}
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-[#687565]">
          {isNewHiker
            ? "Choose the trail that sounds more appealing. There are no wrong answers — Talus will use your choices to find a good fit."
            : "Choose the trail you prefer. There are no wrong answers — Talus will use your choices to learn what makes a great hike for you."}
        </p>

        <div className="mt-6">
          <div className="mx-auto h-1.5 max-w-xs overflow-hidden rounded-full bg-[#d8d2c4]">
            <div
              className="h-full rounded-full bg-[#314936] transition-all"
              style={{
                width: `${
                  (comparisonCount /
                    INITIAL_COMPARISONS) *
                  100
                }%`,
              }}
            />
          </div>

          <p className="mt-2 text-xs uppercase tracking-[0.15em] text-[#8a9184]">
            {comparisonCount} of{" "}
            {INITIAL_COMPARISONS} comparisons
          </p>
        </div>
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
            chooseWinner(
              leftTrail,
              rightTrail
            )
          }
        />

        <TrailChoice
          trail={rightTrail}
          disabled={submitting}
          onChoose={() =>
            chooseWinner(
              rightTrail,
              leftTrail
            )
          }
        />
      </div>

      <p className="mt-8 text-center text-sm text-[#687565]">
        {submitting
          ? "Learning from your choice..."
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
          {trail.trail.elevation_gain_feet.toLocaleString()}{" "}
          ft elevation
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
