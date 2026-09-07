import { useEffect, useState } from "react"

import {
  getActivities,
  type Activity,
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

function RatingSummary({
  label,
  value,
}: {
  label: string
  value: number | null
}) {
  if (value === null) {
    return null
  }

  return (
    <span>
      {label} {value}/5
    </span>
  )
}

function Activities() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadActivities() {
      try {
        const data = await getActivities(1)
        setActivities(data)
      } finally {
        setLoading(false)
      }
    }

    loadActivities()
  }, [])

  return (
    <section>
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#687565]">
        Your history
      </p>

      <h1 className="mt-3 text-4xl font-semibold tracking-tight">
        Your hikes
      </h1>

      <p className="mt-4 max-w-xl text-lg leading-8 text-[#687565]">
        A record of the trails you've explored and the miles you've
        put behind you.
      </p>

      {loading && (
        <p className="mt-10 text-[#687565]">
          Loading your hikes...
        </p>
      )}

      {!loading && activities.length === 0 && (
        <div className="mt-10 rounded-3xl border border-[#d8d2c4] bg-[#ebe6da] p-8">
          <h2 className="text-2xl font-semibold">
            No hikes yet.
          </h2>

          <p className="mt-3 max-w-xl leading-7 text-[#687565]">
            Once you record your first hike, it will appear here.
          </p>
        </div>
      )}

      {!loading && activities.length > 0 && (
        <div className="mt-10 space-y-4">
          {activities.map((activity) => (
            <article
              key={activity.id}
              className="rounded-3xl border border-[#d8d2c4] bg-[#ebe6da] p-6"
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {activity.trail.name}
                  </h2>

                  <p className="mt-1 text-sm text-[#687565]">
                    {formatActivityDate(
                      activity.started_at ?? activity.created_at
                    )}
                  </p>

                  {activity.trail.location && (
                    <p className="mt-1 text-sm text-[#687565]">
                      {activity.trail.location}
                    </p>
                  )}
                </div>

                {activity.distance_miles !== null && (
                  <p className="text-2xl font-semibold text-[#314936]">
                    {activity.distance_miles} mi
                  </p>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-5 text-sm text-[#687565]">
                {activity.elevation_gain_feet !== null && (
                  <span>
                    {activity.elevation_gain_feet.toLocaleString()} ft
                    elevation
                  </span>
                )}

                {activity.duration_seconds !== null && (
                  <span>
                    {formatActivityDuration(
                      activity.duration_seconds
                    )}
                  </span>
                )}
              </div>

              {activity.experience && (
                <div className="mt-6 border-t border-[#d8d2c4] pt-6">
                  <div className="flex items-center gap-3">
                    <span className="text-lg tracking-[0.15em] text-[#314936]">
                      {"★".repeat(activity.experience.overall_rating)}
                    </span>

                    <span className="text-sm font-medium text-[#687565]">
                      {activity.experience.overall_rating}/5 overall
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-[#687565]">
                    <RatingSummary
                      label="Scenery"
                      value={activity.experience.scenic_rating}
                    />

                    <RatingSummary
                      label="Difficulty"
                      value={activity.experience.difficulty_rating}
                    />

                    <RatingSummary
                      label="Solitude"
                      value={activity.experience.solitude_rating}
                    />
                  </div>

                  {activity.experience.notes && (
                    <p className="mt-4 max-w-2xl leading-7 text-[#526052]">
                      "{activity.experience.notes}"
                    </p>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default Activities