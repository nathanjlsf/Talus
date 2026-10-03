import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { ArrowRight, Compass } from "lucide-react"

import {
  getActivities,
  getCurrentTalusUser,
  getPreferenceInsights,
  getRanking,
  type Activity,
  type PreferenceInsight,
  type RankedTrail,
} from "../services/api"

function formatActivityDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatActivityDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes} min`
}

function Home() {
  const navigate = useNavigate()

  const [ranking, setRanking] = useState<RankedTrail[]>([])
  const [insights, setInsights] = useState<PreferenceInsight[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadHomeData() {
      const user = await getCurrentTalusUser()

      try {
        const [rankingData, insightData, activityData] = await Promise.all([
          getRanking(user.id),
          getPreferenceInsights(user.id),
          getActivities(user.id),
        ])

        setRanking(rankingData)
        setInsights(insightData)
        setActivities(activityData)
      } finally {
        setLoading(false)
      }
    }

    loadHomeData()
  }, [])

  const hasLearnedPreferences = insights.length > 0
  const topTrail = hasLearnedPreferences
    ? ranking[0]
    : null

  return (
    <section>
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#687565]">
        Your hiking companion
      </p>

      <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
        What should you hike next?
      </h1>

      <p className="mt-4 max-w-xl leading-7 text-[#687565] md:text-lg md:leading-8">
        Talus learns what you enjoy and uses it to help you find trails
        that fit you better.
      </p>

      {loading && (
        <p className="mt-10 text-[#687565]">
          Finding your next trail...
        </p>
      )}

      {!loading && topTrail && (
        <div className="mt-8 rounded-3xl border border-[#d8d2c4] bg-[#ebe6da] p-5 md:mt-10 md:p-8">
          <div className="flex items-start justify-between gap-4 md:gap-6">
            <div className="min-w-0">
              <p className="text-sm font-medium uppercase tracking-[0.15em] text-[#687565]">
                Your top match
              </p>

              <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
                {topTrail.trail.name}
              </h2>

              {topTrail.trail.location && (
                <p className="mt-1 text-[#687565]">
                  {topTrail.trail.location}
                </p>
              )}
            </div>

            <div className="shrink-0 text-right">
              <p className="text-2xl font-semibold text-[#314936] md:text-3xl">
                {Math.round(topTrail.score)}%
              </p>

              <p className="text-[10px] uppercase tracking-[0.15em] text-[#8a9184] md:text-xs">
                <span className="hidden md:inline">personal </span>
                match
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            {topTrail.explanations.length > 0 ? (
              topTrail.explanations.map((explanation) => (
                <p
                  key={explanation.attribute}
                  className="max-w-2xl leading-7 text-[#526052]"
                >
                  {explanation.message}
                </p>
              ))
            ) : (
              <p className="max-w-2xl leading-7 text-[#526052]">
                This trail is currently your strongest match based on what Talus
                has learned about you.
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-5 text-sm text-[#687565]">
            <span>{topTrail.trail.distance_miles} mi</span>

            <span>
              {topTrail.trail.elevation_gain_feet.toLocaleString()} ft elevation
            </span>

            <span>{topTrail.trail.difficulty}</span>
          </div>

          <button
            onClick={() => {
              navigate(`/trails/${topTrail.trail.id}`)
            }}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#314936] px-5 py-3 font-medium text-white transition hover:bg-[#263a2b] md:mt-8 md:w-auto"
          >
            View trail
            <ArrowRight size={17} />
          </button>
        </div>
      )}

      {!loading && !hasLearnedPreferences && (
        <div className="mt-8 rounded-3xl border border-[#d8d2c4] bg-[#ebe6da] p-5 md:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.15em] text-[#687565]">
            Start here
          </p>

          <h2 className="mt-3 text-2xl font-semibold">
            Let's figure out your hiking style.
          </h2>

          <p className="mt-3 max-w-xl leading-7 text-[#687565]">
            Tell Talus which trails you'd rather hike. After a few choices,
            we'll start building recommendations around what you actually like.
          </p>

          <button
            onClick={() => {
              navigate("/onboarding")
            }}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#314936] px-5 py-3 font-medium text-white transition hover:bg-[#263a2b]"
          >
            Get started
            <ArrowRight size={17} />
          </button>
        </div>
      )}

      {!loading && insights.length > 0 && (
        <div className="mt-8 rounded-3xl border border-[#d8d2c4] bg-[#ebe6da] p-5 md:p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.15em] text-[#687565]">
                Your Hike DNA
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                What Talus has learned
              </h2>
            </div>

            <button
              onClick={() => {
                navigate("/hike-dna")
              }}
              className="shrink-0 whitespace-nowrap py-1 text-sm font-medium text-[#314936] hover:underline"
            >
              View all →
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {insights.slice(0, 4).map((insight) => (
              <div
                key={insight.attribute}
                className="rounded-2xl bg-[#f3efe4] px-5 py-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium">
                    {insight.label}
                  </span>

                  <span className="text-sm font-medium capitalize text-[#687565]">
                    {insight.direction === "range"
                      ? "Sweet spot"
                      : insight.direction}
                  </span>
                </div>

                <p className="mt-2 text-sm leading-6 text-[#687565]">
                  {insight.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && activities.length > 0 && (
        <div className="mt-8 rounded-3xl border border-[#d8d2c4] bg-[#ebe6da] p-5 md:p-8">
            <div className="flex items-start justify-between gap-6">
            <div>
                <p className="text-sm font-medium uppercase tracking-[0.15em] text-[#687565]">
                Recent activity
                </p>

                <h2 className="mt-2 text-2xl font-semibold">
                Recent hikes
                </h2>
            </div>

            <button
                onClick={() => {
                navigate("/activities")
                }}
                className="shrink-0 whitespace-nowrap py-1 text-sm font-medium text-[#314936] hover:underline"
            >
                View all →
            </button>
            </div>

            <div className="mt-6 space-y-4">
            {activities.slice(0, 3).map((activity) => (
                <div
                key={activity.id}
                className="rounded-2xl bg-[#f3efe4] px-5 py-4"
                >
                <div className="flex items-start justify-between gap-4">
                    <div>
                    <h3 className="font-semibold">
                        {activity.trail.name}
                    </h3>

                    <p className="mt-1 text-sm text-[#687565]">
                      {formatActivityDate(activity.started_at ?? activity.created_at)}
                    </p>

                    {activity.trail.location && (
                        <p className="mt-1 text-sm text-[#687565]">
                        {activity.trail.location}
                        </p>
                    )}
                    </div>

                    {activity.distance_miles !== null && (
                    <span className="text-sm font-medium text-[#314936]">
                        {activity.distance_miles} mi
                    </span>
                    )}
                </div>

                <div className="mt-3 flex flex-wrap gap-4 text-sm text-[#687565]">
                    {activity.elevation_gain_feet !== null && (
                    <span>
                        {activity.elevation_gain_feet.toLocaleString()} ft elevation
                    </span>
                    )}

                    {activity.duration_seconds !== null && (
                    <span>
                        {formatActivityDuration(activity.duration_seconds)}
                    </span>
                    )}
                </div>
                </div>
            ))}
            </div>
        </div>
        )}

      <div className="mt-8">
        <button
          onClick={() => {
            navigate("/trails")
          }}
          className="group w-full rounded-3xl border border-[#d8d2c4] bg-[#ebe6da] p-5 text-left md:w-auto md:p-6 transition hover:bg-[#e4dfd2]"
        >
          <Compass size={22} className="text-[#314936]" />

          <h2 className="mt-4 text-xl font-semibold">
            Explore trails
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#687565]">
            Search trails, filter by difficulty, and find your next
            adventure.
          </p>

          <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#314936]">
            Discover
            <ArrowRight
              size={15}
              className="transition-transform group-hover:translate-x-1"
            />
          </span>
        </button>
      </div>
    </section>
  )
}

export default Home
