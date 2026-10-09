import { useEffect, useState } from "react"
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router"
import { ArrowLeft, Check, Mountain, Sparkles } from "lucide-react"

import StickyActionBar from "../components/StickyActionBar"
import TrailMap from "../components/TrailMap"
import {
  getCurrentTalusUser,
  getTrail,
  getTrailGeometry,
  getRanking,
  type RankedTrail,
  type Trail,
  type TrailMapFeature,
} from "../services/api"

function TrailDetail() {
  const { trailId: trailIdParam } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [trail, setTrail] = useState<Trail | null>(null)
  const [recommendation, setRecommendation] =
    useState<RankedTrail | null>(null)
  const [route, setRoute] =
    useState<TrailMapFeature | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTrail() {
      try {
        setLoading(true)
        setError(null)

        const trailId = Number(trailIdParam)

        if (!trailId) {
          throw new Error("Invalid trail")
        }

        const user = await getCurrentTalusUser()
        const trailData = await getTrail(trailId)

        const [ranking, geometry] = await Promise.all([
          getRanking(user.id, {
            ids: [trailId],
          }),
          getTrailGeometry(trailId).catch(() => null),
        ])

        setTrail(trailData)
        setRoute(geometry)

        const rankedTrail = ranking.find(
          (item) => item.trail.id === trailId
        )

        setRecommendation(rankedTrail ?? null)
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

    loadTrail()
  }, [trailIdParam])

  if (loading) {
    return (
      <section>
        <p className="text-[#687565]">
          Loading trail...
        </p>
      </section>
    )
  }

  if (error || !trail) {
    return (
      <section>
        <p className="text-red-700">
          {error ?? "Trail not found"}
        </p>
      </section>
    )
  }

  const matchScore = recommendation
    ? Math.round(recommendation.score)
    : null

  return (
    <section>
      <button
        type="button"
        onClick={() => {
          if (location.key === "default") {
            navigate("/trails")
          } else {
            navigate(-1)
          }
        }}
        className="-ml-1 flex min-h-11 items-center gap-2 px-1 text-sm font-medium text-[#687565] transition hover:text-[#26352a]"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="mt-4 max-w-3xl md:mt-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#687565]">
          Trail
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
          {trail.name}
        </h1>

        {trail.park_name ? (
          <div className="mt-2">
            <p className="text-lg text-[#687565]">
              {trail.park_name}
            </p>

            {trail.park_source === "california_state_parks" && (
              <p className="mt-1 text-xs uppercase tracking-[0.15em] text-[#8a9184]">
                California State Parks
              </p>
            )}
          </div>
        ) : (
          trail.location && (
            <p className="mt-2 text-lg text-[#687565]">
              {trail.location}
            </p>
          )
        )}
      </div>

      {route && (
        <div className="mt-6 h-64 overflow-hidden rounded-3xl border border-[#d8d2c4] md:mt-8">
          <TrailMap
            features={[
              {
                ...route,
                properties: {
                  ...route.properties,
                  score: 80,
                },
              },
            ]}
            bounds={routeBounds(route)}
            fitOnce={false}
          />
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 md:mt-8 md:gap-5 lg:grid-cols-5">
        <div className="rounded-2xl border border-[#d8d2c4] bg-[#ebe6da] p-4 md:p-5">
          <p className="text-xs uppercase tracking-[0.15em] text-[#8a9184]">
            Distance
          </p>

          <p className="mt-1.5 text-xl font-semibold md:mt-2 md:text-2xl">
            {trail.distance_miles} mi
          </p>
        </div>

        <div className="rounded-2xl border border-[#d8d2c4] bg-[#ebe6da] p-4 md:p-5">
          <p className="text-xs uppercase tracking-[0.15em] text-[#8a9184]">
            Elevation
          </p>

          <p className="mt-1.5 text-xl font-semibold md:mt-2 md:text-2xl">
            {trail.elevation_gain_feet.toLocaleString()} ft
          </p>
        </div>

        <div className="rounded-2xl border border-[#d8d2c4] bg-[#ebe6da] p-4 md:p-5">
          <p className="text-xs uppercase tracking-[0.15em] text-[#8a9184]">
            Difficulty
          </p>

          <p className="mt-1.5 text-xl font-semibold md:mt-2 md:text-2xl">
            {trail.difficulty}
          </p>
        </div>

        <div className="rounded-2xl border border-[#d8d2c4] bg-[#ebe6da] p-4 md:p-5">
          <p className="text-xs uppercase tracking-[0.15em] text-[#8a9184]">
            Estimated time
          </p>

          <p className="mt-1.5 text-xl font-semibold md:mt-2 md:text-2xl">
            {trail.estimated_time_minutes < 60
              ? `${trail.estimated_time_minutes} min`
              : `${Math.floor(trail.estimated_time_minutes / 60)} hr${
                  trail.estimated_time_minutes % 60
                    ? ` ${trail.estimated_time_minutes % 60} min`
                    : ""
               }`}
          </p>
        </div>

        <div className="rounded-2xl border border-[#d8d2c4] bg-[#ebe6da] p-4 md:p-5">
          <p className="text-xs uppercase tracking-[0.15em] text-[#8a9184]">
            Terrain
          </p>

          <p className="mt-1.5 text-xl font-semibold md:mt-2 md:text-2xl">
            {trail.terrain}
          </p>
        </div>
      </div>

      {trail.description && (
        <div className="mt-8 max-w-3xl md:mt-10">
          <h2 className="text-xl font-semibold md:text-2xl">
            About this trail
          </h2>

          <p className="mt-3 leading-7 text-[#526052] md:mt-4 md:text-lg md:leading-8">
            {trail.description}
          </p>
        </div>
      )}

      <div className="mt-8 max-w-3xl md:mt-10">
        <h2 className="text-xl font-semibold md:text-2xl">
          Trail character
        </h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:mt-5 md:gap-4">
          {[
            { label: "Scenic", value: trail.scenic_score },
            { label: "Forest", value: trail.forest_score },
            { label: "Water", value: trail.water_score },
            { label: "Coastal", value: trail.coastal_score },
          ]
            .filter((attribute) => attribute.value !== null)
            .map((attribute) => {
              const percentage = Math.round(
                (attribute.value ?? 0) * 100
              )

              return (
                <div
                  key={attribute.label}
                  className="rounded-2xl border border-[#d8d2c4] bg-[#ebe6da] p-4 md:p-5"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#526052]">
                      {attribute.label}
                    </p>

                    <p className="text-sm font-semibold text-[#314936]">
                      {percentage}%
                    </p>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#d8d2c4]">
                    <div
                      className="h-full rounded-full bg-[#526b4f]"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {recommendation && (
        <div className="mt-8 max-w-3xl rounded-3xl border border-[#d8d2c4] bg-[#ebe6da] p-5 md:mt-10 md:p-7">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-[#314936] p-3 text-white">
              <Sparkles size={19} />
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#687565]">
                Personal recommendation
              </p>

              <p className="mt-1 text-2xl font-semibold text-[#314936] md:text-3xl">
                {matchScore}% match
              </p>
            </div>
          </div>

          {recommendation.explanations.length > 0 && (
            <div className="mt-6 border-t border-[#d8d2c4] pt-5">
              <p className="text-sm font-medium uppercase tracking-[0.15em] text-[#687565]">
                Why Talus recommends it
              </p>

              <div className="mt-3 space-y-2">
                {recommendation.explanations.map(
                  (explanation) => (
                    <p
                      key={explanation.attribute}
                      className="leading-7 text-[#526052]"
                    >
                      {explanation.message}
                    </p>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-10 hidden max-w-3xl rounded-3xl border border-[#d8d2c4] bg-[#314936] p-7 text-white md:block">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-white/10 p-3">
            <Mountain size={22} />
          </div>

          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#d8dfd5]">
              Ready to hike?
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              Log your experience
            </h2>

            <p className="mt-2 max-w-xl leading-7 text-[#d8dfd5]">
              Record this hike and tell Talus what you thought.
              Your feedback helps improve future recommendations.
            </p>

            <Link
              to={`/add-hike?trail=${trail.id}`}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#f3efe4] px-5 py-3 font-medium text-[#26352a] transition hover:bg-white"
            >
              <Check size={17} />
              Log this hike
            </Link>
          </div>
        </div>
      </div>

      <StickyActionBar className="mt-8 md:hidden">
        <Link
          to={`/add-hike?trail=${trail.id}`}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#314936] px-6 py-3 font-medium text-white shadow-lg shadow-[#26352a]/15 transition hover:bg-[#263b2b]"
        >
          <Check size={17} />
          Log this hike
        </Link>
      </StickyActionBar>
    </section>
  )
}

function routeBounds(
  feature: TrailMapFeature
): [number, number, number, number] {
  let west = Infinity
  let south = Infinity
  let east = -Infinity
  let north = -Infinity

  for (const line of feature.geometry.coordinates) {
    for (const [longitude, latitude] of line) {
      if (
        longitude === undefined ||
        latitude === undefined
      ) {
        continue
      }

      west = Math.min(west, longitude)
      east = Math.max(east, longitude)
      south = Math.min(south, latitude)
      north = Math.max(north, latitude)
    }
  }

  return [west, south, east, north]
}

export default TrailDetail
