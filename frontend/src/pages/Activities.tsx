import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"

import {
  deleteActivity,
  getActivities,
  getCurrentTalusUser,
  type Activity,
} from "../services/api"
import { discardRecording } from "../services/recordingSession"

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

function DeleteHikeControl({
  activity,
  pending,
  deleting,
  error,
  onAsk,
  onCancel,
  onConfirm,
}: {
  activity: Activity
  pending: boolean
  deleting: boolean
  error: string | null
  onAsk: () => void
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="ml-auto flex flex-col items-end gap-2">
      {pending ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <p className="text-sm text-[#526052]">
            Delete this hike?
          </p>

          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-full px-3 text-sm font-medium text-[#526052]"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className="min-h-11 rounded-full bg-[#7a3b2e] px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "Delete hike"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onAsk}
          className="min-h-11 rounded-full px-1 text-sm font-medium text-[#7a3b2e]"
        >
          Delete
        </button>
      )}

      {error && pending && (
        <p className="text-sm text-red-700">{error}</p>
      )}
    </div>
  )
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
  const navigate = useNavigate()

  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<
    number | null
  >(null)
  const [deletingId, setDeletingId] = useState<number | null>(
    null
  )
  const [deleteError, setDeleteError] = useState<string | null>(
    null
  )

  async function removeHike(activity: Activity) {
    try {
      setDeletingId(activity.id)
      setDeleteError(null)
      await deleteActivity(activity.id)
      await discardRecording(activity.id)
      setActivities((current) =>
        current.filter((item) => item.id !== activity.id)
      )
      setPendingDeleteId(null)
    } catch (removeError) {
      setDeleteError(
        removeError instanceof Error
          ? removeError.message
          : "Couldn't delete that hike"
      )
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    async function loadActivities() {
      try {
        const user = await getCurrentTalusUser()
        const data = await getActivities(user.id)
        setActivities(data)
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load your hikes"
        )
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

      <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
        Your hikes
      </h1>

      <p className="mt-4 max-w-xl leading-7 text-[#687565] md:text-lg md:leading-8">
        A record of the trails you've explored and the miles you've
        put behind you.
      </p>

      {loading && (
        <p className="mt-10 text-[#687565]">
          Loading your hikes...
        </p>
      )}

      {error && (
        <div className="mt-10 rounded-2xl border border-[#c9bfb0] bg-[#e8e3d6] p-6">
          <p className="font-medium">
            Couldn’t load your hikes.
          </p>

          <p className="mt-2 text-sm text-[#687565]">
            Make sure the Talus backend is running and try again.
          </p>
        </div>
      )}

      {!loading && !error && activities.length === 0 && (
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
              className="rounded-3xl border border-[#d8d2c4] bg-[#ebe6da] p-5 md:p-6"
            >
              <div className="flex items-start justify-between gap-4 md:gap-6">
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                    <Link
                      to={`/activities/${activity.id}`}
                      className="hover:underline"
                    >
                      {activity.trail.name}
                    </Link>
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
                  <p className="shrink-0 text-xl font-semibold text-[#314936] md:text-2xl">
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

              {!activity.experience && (
                <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#d8d2c4] pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      navigate(`/activities/${activity.id}/experience`)
                    }}
                    className="min-h-11 rounded-full bg-[#314936] px-5 py-2.5 font-medium text-white transition hover:bg-[#263b2b]"
                  >
                    Tell Talus how it went
                  </button>

                  <DeleteHikeControl
                    activity={activity}
                    pending={pendingDeleteId === activity.id}
                    deleting={deletingId === activity.id}
                    error={deleteError}
                    onAsk={() => {
                      setPendingDeleteId(activity.id)
                      setDeleteError(null)
                    }}
                    onCancel={() => {
                      setPendingDeleteId(null)
                      setDeleteError(null)
                    }}
                    onConfirm={() => {
                      void removeHike(activity)
                    }}
                  />
                </div>
              )}

              {activity.experience && (
                <div className="mt-6 border-t border-[#d8d2c4] pt-6">
                  <div className="flex flex-wrap gap-4 text-sm text-[#687565]">
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

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="text-lg tracking-[0.15em] text-[#314936]">
                      {"★".repeat(activity.experience.overall_rating)}
                    </span>

                    <span className="text-sm font-medium text-[#687565]">
                      {activity.experience.overall_rating}/5 overall
                    </span>

                    <DeleteHikeControl
                      activity={activity}
                      pending={pendingDeleteId === activity.id}
                      deleting={deletingId === activity.id}
                      error={deleteError}
                      onAsk={() => {
                        setPendingDeleteId(activity.id)
                        setDeleteError(null)
                      }}
                      onCancel={() => {
                        setPendingDeleteId(null)
                        setDeleteError(null)
                      }}
                      onConfirm={() => {
                        void removeHike(activity)
                      }}
                    />
                  </div>
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