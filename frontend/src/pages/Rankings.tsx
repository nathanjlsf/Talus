import { useEffect, useState } from "react"

import TrailCard from "../components/TrailCard"
import TrailResultCard from "../components/TrailResultCard"
import {
  getRanking,
  getTrails,
  type RankedTrail,
  type Trail,
} from "../services/api"

function Rankings() {
  const [ranking, setRanking] = useState<RankedTrail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<Trail[]>([])
  const [searching, setSearching] = useState(false)

  const [difficulty, setDifficulty] = useState("")
  const [maxDistance, setMaxDistance] = useState("")
  const [maxElevation, setMaxElevation] = useState("")
  const [sortBy, setSortBy] = useState("match")

  useEffect(() => {
    async function loadRanking() {
      try {
        const data = await getRanking(1)
        setRanking(data)
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

    loadRanking()
  }, [])

  useEffect(() => {
    const trimmedSearch = search.trim()

    const timeout = window.setTimeout(async () => {
      const hasFilters =
        trimmedSearch ||
        difficulty ||
        maxDistance ||
        maxElevation

      if (!hasFilters) {
        setSearchResults([])
        setSearching(false)
        return
      }

      try {
        setSearching(true)

        const data = await getTrails({
          search: trimmedSearch,
          difficulty: difficulty || undefined,
          maxDistance: maxDistance
            ? Number(maxDistance)
            : undefined,
          maxElevation: maxElevation
            ? Number(maxElevation)
            : undefined,
        })

        setSearchResults(data)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [search, difficulty, maxDistance, maxElevation])

  const sortedResults = [...searchResults].sort((a, b) => {
    if (sortBy === "distance") {
      return a.distance_miles - b.distance_miles
    }

    if (sortBy === "elevation") {
      return a.elevation_gain_feet - b.elevation_gain_feet
    }

    const aScore =
      ranking.find((item) => item.trail.id === a.id)?.score ?? 0

    const bScore =
      ranking.find((item) => item.trail.id === b.id)?.score ?? 0

    return bScore - aScore
  })

  const isSearching = 
    search.trim().length > 0 ||
    difficulty !== "" ||
    maxDistance !== "" ||
    maxElevation !== ""

  return (
    <section>
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#687565]">
        Personalized Recommendations
      </p>

      <h1 className="mt-3 text-4xl font-semibold tracking-tight">
        Your next favorite trail
      </h1>

      <p className="mt-4 max-w-xl text-lg leading-8 text-[#687565]">
        Trails ranked by how well they match what Talus has learned about
        your hiking preferences.
      </p>

      <div className="mt-10">
        <div className="rounded-3xl border border-[#d8d2c4] bg-[#ebe6da] p-6">
          <label
            htmlFor="trail-search"
            className="text-sm font-medium uppercase tracking-[0.15em] text-[#687565]"
          >
            Find a trail
          </label>

          <input
            id="trail-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by trail, location, or description..."
            className="mt-3 w-full rounded-xl border border-[#c9c4b7] bg-[#f3efe4] px-4 py-3 text-[#26352a] outline-none transition placeholder:text-[#8b8f83] focus:border-[#314936]"
          />

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label
                htmlFor="difficulty"
                className="text-sm font-medium text-[#687565]"
              >
                Difficulty
              </label>

              <select
                id="difficulty"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#c9c4b7] bg-[#f3efe4] px-4 py-3 text-[#26352a] outline-none focus:border-[#314936]"
              >
                <option value="">All difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Moderate">Moderate</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="max-distance"
                className="text-sm font-medium text-[#687565]"
              >
                Max distance
              </label>

              <select
                id="max-distance"
                value={maxDistance}
                onChange={(event) => setMaxDistance(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#c9c4b7] bg-[#f3efe4] px-4 py-3 text-[#26352a] outline-none focus:border-[#314936]"
              >
                <option value="">Any distance</option>
                <option value="2">2 miles</option>
                <option value="5">5 miles</option>
                <option value="10">10 miles</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="max-elevation"
                className="text-sm font-medium text-[#687565]"
              >
                Max elevation
              </label>

              <select
                id="max-elevation"
                value={maxElevation}
                onChange={(event) => setMaxElevation(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#c9c4b7] bg-[#f3efe4] px-4 py-3 text-[#26352a] outline-none focus:border-[#314936]"
              >
                <option value="">Any elevation</option>
                <option value="500">500 ft</option>
                <option value="1000">1,000 ft</option>
                <option value="2000">2,000 ft</option>
              </select>
            </div>
          </div>
        </div>

        {isSearching ? (
          <div className="mt-8">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.15em] text-[#687565]">
                  Search results
                </p>

                <h2 className="mt-1 text-2xl font-semibold">
                  {search.trim()
                    ? `Trails matching "${search.trim()}"`
                    : "Filtered trails"}
                </h2>
              </div>

              {searching && (
                <p className="text-sm text-[#687565]">
                  Searching...
                </p>
              )}
            </div>

            {!searching && searchResults.length === 0 && (
              <div className="rounded-2xl border border-[#d8d2c4] bg-[#ebe6da] p-8">
                <h2 className="text-xl font-semibold">
                  No trails found.
                </h2>

                <p className="mt-2 text-[#687565]">
                  Try searching for a different trail name, location, or
                  keyword.
                </p>
              </div>
            )}

            {!searching && searchResults.length > 0 && (
              <div>
                <div className="mb-6 flex items-center justify-between gap-4">
                  <p className="text-sm text-[#687565]">
                    {searchResults.length} trail
                    {searchResults.length === 1 ? "" : "s"} found
                  </p>

                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="sort-by"
                      className="text-sm font-medium text-[#687565]"
                    >
                      Sort by
                    </label>

                    <select
                      id="sort-by"
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value)}
                      className="rounded-xl border border-[#c9c4b7] bg-[#f3efe4] px-4 py-2 text-sm text-[#26352a] outline-none focus:border-[#314936]"
                    >
                      <option value="match">Best match</option>
                      <option value="distance">Shortest</option>
                      <option value="elevation">Lowest elevation</option>
                    </select>
                  </div>
                </div>

                {sortedResults.map((trail) => {
                  const recommendation = ranking.find(
                    (item) => item.trail.id === trail.id
                  )

                  if (recommendation) {
                    return (
                      <TrailCard
                        key={trail.id}
                        rankedTrail={recommendation}
                      />
                    )
                  }

                  return (
                    <TrailResultCard
                      key={trail.id}
                      trail={trail}
                    />
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-8">
            {loading && (
              <p className="py-10 text-[#687565]">
                Loading your rankings...
              </p>
            )}

            {error && (
              <div className="rounded-2xl border border-[#c9bfb0] bg-[#e8e3d6] p-6">
                <p className="font-medium">
                  Couldn’t load your rankings.
                </p>

                <p className="mt-2 text-sm text-[#687565]">
                  Make sure the Talus backend is running on port 3000.
                </p>
              </div>
            )}

            {!loading && !error && ranking.length === 0 && (
              <div className="rounded-2xl border border-[#d8d2c4] bg-[#ebe6da] p-8">
                <h2 className="text-xl font-semibold">
                  Your ranking is empty.
                </h2>

                <p className="mt-2 text-[#687565]">
                  Start comparing trails and Talus will begin learning
                  your preferences.
                </p>
              </div>
            )}

            {!loading && !error && ranking.length > 0 && (
              <div>
                <div className="mb-6 rounded-2xl border border-[#d8d2c4] bg-[#ebe6da] px-5 py-4">
                  <p className="text-sm leading-6 text-[#687565]">
                    Your recommendations update as you compare trails and
                    complete hikes.
                  </p>
                </div>

                <div>
                  {ranking.map((rankedTrail) => (
                    <TrailCard
                      key={rankedTrail.trail.id}
                      rankedTrail={rankedTrail}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export default Rankings
