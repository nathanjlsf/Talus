import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { Mountain, TrendingUp } from "lucide-react"

import {
  getCurrentTalusUser,
  getNextComparison,
  submitComparison,
  type RankedTrail,
} from "../services/api"
import { trailPlace } from "../trailSummary"

const INITIAL_COMPARISONS = 5

function Compare() {
  const [userId, setUserId] = useState<number | null>(null)

  const [leftTrail, setLeftTrail] =
    useState<RankedTrail | null>(null)

  const [rightTrail, setRightTrail] =
    useState<RankedTrail | null>(null)

  const [comparisonCount, setComparisonCount] =
    useState(0)

  const [shownTrailIds, setShownTrailIds] =
    useState<number[]>([])

  const [loading, setLoading] =
    useState(true)

  const [submitting, setSubmitting] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const experienceType =
    searchParams.get("experience")

  const isNewHiker =
    experienceType === "new"

  const isExperiencedHiker =
    experienceType === "experienced"

  useEffect(() => {
    async function loadComparison() {
      const user = await getCurrentTalusUser()
      setUserId(user.id)

      try {
        const comparison =
          await getNextComparison(
            user.id,
            shownTrailIds
        )

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

        setShownTrailIds([
          comparison.firstTrail.id,
          comparison.secondTrail.id,
        ])
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

      if (userId === null) {
        throw new Error("User not found")
      }

      await submitComparison(
        userId,
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
        await getNextComparison(
          userId,
          shownTrailIds
      )

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

      setShownTrailIds((current) => [
        ...current,
        comparison.firstTrail.id,
        comparison.secondTrail.id,
      ])
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

          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            {isNewHiker
              ? "Your first hiking style is taking shape."
              : "Your hiking style is taking shape."}
          </h1>

          <p className="mt-4 leading-7 text-[#687565] md:text-lg md:leading-8">
            {isNewHiker
              ? "Talus has a better idea of what sounds appealing to you. Let's use that to find a great first hike."
              : "Talus has learned a little more about what you like. Keep exploring to make your recommendations even better."}
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => {
                navigate("/trails")
              }}
              className="min-h-12 w-full rounded-full bg-[#314936] px-6 py-3 sm:w-auto font-medium text-white transition hover:bg-[#263b2b]"
            >
              Discover my trails
            </button>

            <button
              type="button"
              onClick={() => {
                navigate("/hike-dna")
              }}
              className="min-h-12 w-full rounded-full border sm:w-auto border-[#b9b6aa] bg-[#f3efe4] px-6 py-3 font-medium text-[#314936] transition hover:border-[#314936]"
            >
              See my Hike DNA
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

        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
          {isNewHiker
            ? "What sounds like a good first hike?"
            : "Which hike would you rather take?"}
        </h1>

        <p className="mx-auto mt-4 max-w-xl leading-7 text-[#687565] md:text-lg md:leading-8">
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

      <div className="mt-8 grid gap-4 md:mt-12 md:grid-cols-2 md:gap-6">
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
  const place = trailPlace(trail.trail)

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onChoose}
      className="group w-full rounded-3xl border border-[#d8d2c4] bg-[#ebe6da] p-5 text-left transition active:scale-[0.99] md:p-8 md:hover:-translate-y-1 hover:border-[#9da695] hover:bg-[#e8e3d6] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.15em] text-[#687565]">
            Trail
          </p>

          <h2 className="mt-2 text-xl font-semibold tracking-tight md:text-2xl">
            {trail.trail.name}
          </h2>

          {place && (
            <p className="mt-1 text-sm text-[#687565]">
              {place}
            </p>
          )}
        </div>

        <div className="rounded-full bg-[#314936] p-3 text-white transition group-hover:scale-105">
          <Mountain size={20} />
        </div>
      </div>

      {trail.trail.description && (
        <p className="mt-4 line-clamp-3 leading-7 text-[#526052] md:mt-6 md:line-clamp-none">
          {trail.trail.description}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#687565] md:mt-7">
        <span>
          {trail.trail.distance_miles} mi
        </span>

        <span>
          {trail.trail.elevation_gain_feet.toLocaleString()}{" "}
          ft elevation
        </span>

        {trail.trail.difficulty.toLowerCase() !== "unknown" && (
          <span>
            {trail.trail.difficulty}
          </span>
        )}

        <span>
          {trail.trail.estimated_time_minutes < 60
            ? `${trail.trail.estimated_time_minutes} min`
            : `${Math.floor(
                trail.trail.estimated_time_minutes / 60
              )} hr${
                trail.trail.estimated_time_minutes % 60
                  ? ` ${
                    trail.trail.estimated_time_minutes % 60
                  } min`
                  : ""
              }`}
        </span>
      </div>

      <div className="mt-5 flex items-center gap-2 font-medium text-[#314936] md:mt-8">
        <TrendingUp size={17} />

        Choose this trail
      </div>
    </button>
  )
}

export default Compare
