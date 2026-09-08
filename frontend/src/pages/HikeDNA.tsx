import { useEffect, useState } from "react"
import {
  Compass,
  Mountain,
  TreePine,
  Waves,
  Eye,
} from "lucide-react"

import {
  getPreferences,
  getPreferenceInsights,
  type UserPreference,
  type PreferenceInsight,
} from "../services/api"

const attributeInfo = {
  scenic: {
    label: "Scenic",
    description: "You value memorable views and scenery.",
    icon: Eye,
  },
  forest: {
    label: "Forest",
    description: "You enjoy wooded and forested trails.",
    icon: TreePine,
  },
  coastal: {
    label: "Coastal",
    description: "You gravitate toward ocean and coastal views.",
    icon: Waves,
  },
  solitude: {
    label: "Solitude",
    description: "You prefer quieter trails with fewer people.",
    icon: Compass,
  },
} as const

function HikeDNA() {
  const [preferences, setPreferences] = useState<
    UserPreference[]
  >([])
  const [insights, setInsights] = useState<
    PreferenceInsight[]
  >([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadPreferences() {
      try {
        const [preferencesData, insightsData] =
          await Promise.all([
            getPreferences(1),
            getPreferenceInsights(1),
          ])

        setPreferences(preferencesData)
        setInsights(insightsData)
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

    loadPreferences()
  }, [])

  if (loading) {
    return (
      <section>
        <p className="text-[#687565]">
          Reading your Hike DNA...
        </p>
      </section>
    )
  }

  if (error) {
    return (
      <section>
        <p className="text-red-700">
          {error}
        </p>
      </section>
    )
  }

  return (
    <section>
      <div className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#687565]">
          Your preferences
        </p>

        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          Hike DNA
        </h1>

        <p className="mt-4 text-lg leading-8 text-[#687565]">
          Talus learns what makes a great hike for you
          from the trails you choose and the experiences
          you share.
        </p>
      </div>

      {preferences.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-[#d8d2c4] bg-[#ebe6da] p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#314936] text-white">
            <Mountain size={24} />
          </div>

          <h2 className="mt-6 text-2xl font-semibold">
            Your Hike DNA is still forming.
          </h2>

          <p className="mt-3 max-w-xl leading-7 text-[#687565]">
            Compare a few trails or log some hikes.
            Talus will start learning the characteristics
            that matter most to you.
          </p>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/compare"
            }}
            className="mt-6 rounded-full bg-[#314936] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#263b2b]"
          >
            Compare trails
          </button>
        </div>
      ) : (
        <>
          <div className="mt-10">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#687565]">
                Your hiking profile
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                What you tend to look for
              </h2>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {preferences.map((preference) => {
                const info =
                  attributeInfo[
                    preference.attribute as keyof typeof attributeInfo
                  ]

                if (!info) {
                  return null
                }

                const Icon = info.icon

                return (
                  <PreferenceCard
                    key={preference.attribute}
                    preference={preference}
                    label={info.label}
                    description={info.description}
                    icon={Icon}
                  />
                )
              })}
            </div>
          </div>

          {insights.length > 0 && (
            <div className="mt-12">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#687565]">
                What Talus has learned
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                Your hiking tendencies
              </h2>

              <div className="mt-5 grid gap-3">
                {insights.map((insight) => {
                  const indicator =
                    insight.direction === "high"
                      ? "↑"
                      : insight.direction === "low"
                        ? "↓"
                        : "•"

                  return (
                    <div
                      key={insight.attribute}
                      className="flex items-start gap-4 rounded-2xl border border-[#d8d2c4] bg-[#ebe6da] p-5"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#314936] text-lg font-semibold text-white">
                        {indicator}
                      </div>

                      <p className="leading-7 text-[#26352a]">
                        {insight.message}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mt-12 rounded-3xl border border-[#d8d2c4] bg-[#314936] p-7 text-white">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#d8dfd5]">
              Keep exploring
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              Your Hike DNA gets better with every hike.
            </h2>

            <p className="mt-2 max-w-2xl leading-7 text-[#d8dfd5]">
              Keep comparing trails and sharing your
              experiences. Talus will use what it learns
              to make your next recommendations more
              personal.
            </p>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/trails"
              }}
              className="mt-5 rounded-xl bg-[#f3efe4] px-5 py-3 font-medium text-[#26352a] transition hover:bg-white"
            >
              Discover your next hike
            </button>
          </div>
        </>
      )}
    </section>
  )
}

interface PreferenceCardProps {
  preference: UserPreference
  label: string
  description: string
  icon: typeof Compass
}

function PreferenceCard({
  preference,
  label,
  description,
  icon: Icon,
}: PreferenceCardProps) {
  const score = Math.round(preference.score)
  const confidence = Math.round(
    preference.confidence * 100
  )

  return (
    <article className="rounded-3xl border border-[#d8d2c4] bg-[#ebe6da] p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-[#314936] p-3 text-white">
            <Icon size={19} />
          </div>

          <div>
            <h2 className="text-xl font-semibold">
              {label}
            </h2>

            <p className="mt-1 text-sm text-[#687565]">
              {description}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <span className="text-2xl font-semibold">
            {score}
          </span>

          <p className="text-xs uppercase tracking-[0.15em] text-[#8a9184]">
            / 100
          </p>
        </div>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#d8d2c4]">
        <div
          className="h-full rounded-full bg-[#314936]"
          style={{
            width: `${score}%`,
          }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.15em] text-[#8a9184]">
        <span>Preference strength</span>

        <span>
          {confidence}% confidence
        </span>
      </div>
    </article>
  )
}

export default HikeDNA
