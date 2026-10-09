import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { ArrowRight, SlidersHorizontal, X } from "lucide-react"

import TrailCard from "../components/TrailCard"
import TrailResultCard from "../components/TrailResultCard"
import {
  getCurrentTalusUser,
  getRanking,
  getTrails,
  type RankedTrail,
  type Trail,
} from "../services/api"

const selectClassName =
  "mt-2 w-full rounded-xl border border-[#c9c4b7] bg-[#f3efe4] px-4 py-3 text-[#26352a] outline-none focus:border-[#314936]"

interface FilterFieldsProps {
  idPrefix: string
  difficulty: string
  maxDistance: string
  maxElevation: string
  onDifficultyChange: (value: string) => void
  onMaxDistanceChange: (value: string) => void
  onMaxElevationChange: (value: string) => void
}

function FilterFields({
  idPrefix,
  difficulty,
  maxDistance,
  maxElevation,
  onDifficultyChange,
  onMaxDistanceChange,
  onMaxElevationChange,
}: FilterFieldsProps) {
  return (
    <>
      <div>
        <label
          htmlFor={`${idPrefix}-difficulty`}
          className="text-sm font-medium text-[#687565]"
        >
          Difficulty
        </label>

        <select
          id={`${idPrefix}-difficulty`}
          value={difficulty}
          onChange={(event) => onDifficultyChange(event.target.value)}
          className={selectClassName}
        >
          <option value="">All difficulties</option>
          <option value="Easy">Easy</option>
          <option value="Moderate">Moderate</option>
          <option value="Hard">Hard</option>
        </select>
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-max-distance`}
          className="text-sm font-medium text-[#687565]"
        >
          Max distance
        </label>

        <select
          id={`${idPrefix}-max-distance`}
          value={maxDistance}
          onChange={(event) => onMaxDistanceChange(event.target.value)}
          className={selectClassName}
        >
          <option value="">Any distance</option>
          <option value="2">2 miles</option>
          <option value="5">5 miles</option>
          <option value="10">10 miles</option>
        </select>
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-max-elevation`}
          className="text-sm font-medium text-[#687565]"
        >
          Max elevation
        </label>

        <select
          id={`${idPrefix}-max-elevation`}
          value={maxElevation}
          onChange={(event) => onMaxElevationChange(event.target.value)}
          className={selectClassName}
        >
          <option value="">Any elevation</option>
          <option value="500">500 ft</option>
          <option value="1000">1,000 ft</option>
          <option value="2000">2,000 ft</option>
        </select>
      </div>
    </>
  )
}

const PAGE_SIZE = 30

function ShowMoreButton({
  shown,
  total,
  onClick,
}: {
  shown: number
  total: number
  onClick: () => void
}) {
  if (shown >= total) {
    return null
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-6 min-h-12 w-full rounded-full border border-[#b9b6aa] bg-[#f3efe4] px-6 py-3 font-medium text-[#314936] transition hover:border-[#314936]"
    >
      Show more trails ({total - shown} left)
    </button>
  )
}

function Explore() {
  const navigate = useNavigate()

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [ranking, setRanking] = useState<RankedTrail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<Trail[]>([])
  const [searchRanking, setSearchRanking] = useState<RankedTrail[]>([])
  const [searching, setSearching] = useState(false)

  const [difficulty, setDifficulty] = useState("")
  const [maxDistance, setMaxDistance] = useState("")
  const [maxElevation, setMaxElevation] = useState("")
  const [sortBy, setSortBy] = useState("match")

  const filterKey = [search, difficulty, maxDistance, maxElevation].join("|")
  const [previousFilterKey, setPreviousFilterKey] = useState(filterKey)

  if (filterKey !== previousFilterKey) {
    setPreviousFilterKey(filterKey)
    setVisibleCount(PAGE_SIZE)
  }

  useEffect(() => {
    async function loadRanking() {
      try {
        const user = await getCurrentTalusUser()
        const results = await getRanking(user.id)
        setRanking(results)
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
        setSearchRanking([])
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

        const user = await getCurrentTalusUser()
        const ranked = data.length
          ? await getRanking(user.id, {
              ids: data.map((trail) => trail.id),
            })
          : []

        setSearchResults(data)
        setSearchRanking(ranked)
      } catch {
        setSearchResults([])
        setSearchRanking([])
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
      searchRanking.find((item) => item.trail.id === a.id)?.score ?? 0

    const bScore =
      searchRanking.find((item) => item.trail.id === b.id)?.score ?? 0

    return bScore - aScore
  })

  const activeFilterCount = [
    difficulty,
    maxDistance,
    maxElevation,
  ].filter(Boolean).length

  const isSearching = 
    search.trim().length > 0 ||
    difficulty !== "" ||
    maxDistance !== "" ||
    maxElevation !== ""

  return (
    <section>
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#687565]">
        Explore & Discover
      </p>

      <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
        Find your next trail
      </h1>

      <p className="mt-4 hidden max-w-xl text-lg leading-8 text-[#687565] md:block">
        Explore trails and discover recommendations shaped by what Talus has
        learned about your hiking preferences.
      </p>

      <div className="mt-4 md:mt-10">
        <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 bg-[#f3efe4] px-4 py-3 md:static md:mx-0 md:rounded-3xl md:border md:border-[#d8d2c4] md:bg-[#ebe6da] md:p-6">
          <label
            htmlFor="trail-search"
            className="hidden text-sm font-medium uppercase tracking-[0.15em] text-[#687565] md:block"
          >
            Find a trail
          </label>

          <div className="flex gap-2 md:mt-3">
            <input
              id="trail-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search trails..."
              aria-label="Search trails"
              className="min-w-0 flex-1 rounded-xl border border-[#c9c4b7] bg-[#f3efe4] px-4 py-3 text-[#26352a] outline-none transition placeholder:text-[#8b8f83] focus:border-[#314936]"
            />

            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="relative flex min-h-12 shrink-0 items-center gap-2 rounded-xl border border-[#c9c4b7] bg-[#ebe6da] px-4 font-medium text-[#314936] md:hidden"
            >
              <SlidersHorizontal size={18} />
              Filters

              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#314936] px-1 text-xs text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <div className="mt-4 hidden gap-4 md:grid md:grid-cols-3">
            <FilterFields
              idPrefix="desktop"
              difficulty={difficulty}
              maxDistance={maxDistance}
              maxElevation={maxElevation}
              onDifficultyChange={setDifficulty}
              onMaxDistanceChange={setMaxDistance}
              onMaxElevationChange={setMaxElevation}
            />
          </div>
        </div>

        {filtersOpen && (
          <div
            className="fixed inset-0 z-40 md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
          >
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => setFiltersOpen(false)}
              className="absolute inset-0 bg-[#26352a]/40"
            />

            <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-[#f3efe4] px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl">
              <div className="mx-auto h-1.5 w-10 rounded-full bg-[#d8d2c4]" />

              <div className="mt-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Filters
                </h2>

                <button
                  type="button"
                  aria-label="Close filters"
                  onClick={() => setFiltersOpen(false)}
                  className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-[#687565] hover:bg-[#e8e3d6]"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <FilterFields
                  idPrefix="sheet"
                  difficulty={difficulty}
                  maxDistance={maxDistance}
                  maxElevation={maxElevation}
                  onDifficultyChange={setDifficulty}
                  onMaxDistanceChange={setMaxDistance}
                  onMaxElevationChange={setMaxElevation}
                />
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDifficulty("")
                    setMaxDistance("")
                    setMaxElevation("")
                  }}
                  className="min-h-12 flex-1 rounded-full border border-[#b9b6aa] px-5 font-medium text-[#314936]"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="min-h-12 flex-[2] rounded-full bg-[#314936] px-5 font-medium text-white"
                >
                  Show trails
                </button>
              </div>
            </div>
          </div>
        )}

        {isSearching ? (
          <div className="mt-4 md:mt-8">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.15em] text-[#687565]">
                  Search results
                </p>

                <h2 className="mt-1 text-xl font-semibold md:text-2xl">
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
              <div className="rounded-2xl border border-[#d8d2c4] bg-[#ebe6da] p-5 md:p-8">
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
                <div className="mb-2 flex items-center justify-between gap-4 md:mb-6">
                  <p className="text-sm text-[#687565]">
                    {searchResults.length} trail
                    {searchResults.length === 1 ? "" : "s"} found
                  </p>

                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="sort-by"
                      className="hidden text-sm font-medium text-[#687565] sm:block"
                    >
                      Sort by
                    </label>

                    <select
                      id="sort-by"
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value)}
                      aria-label="Sort by"
                      className="min-h-11 rounded-xl border border-[#c9c4b7] bg-[#f3efe4] px-3 py-2 text-base text-[#26352a] outline-none focus:border-[#314936] md:px-4 md:text-sm"
                    >
                      <option value="match">Best match</option>
                      <option value="distance">Shortest</option>
                      <option value="elevation">Lowest elevation</option>
                    </select>
                  </div>
                </div>

                {sortedResults.slice(0, visibleCount).map((trail) => {
                  const recommendation = searchRanking.find(
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

                <ShowMoreButton
                  shown={visibleCount}
                  total={sortedResults.length}
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 md:mt-8">
            {loading && (
              <p className="py-10 text-[#687565]">
                Finding trails for you...
              </p>
            )}

            {error && (
              <div className="rounded-2xl border border-[#c9bfb0] bg-[#e8e3d6] p-6">
                <p className="font-medium">
                  Couldn’t load your trail recommendations.
                </p>

                <p className="mt-2 text-sm text-[#687565]">
                  Make sure the Talus backend is running on port 3000.
                </p>
              </div>
            )}

            {!loading && !error && ranking.length === 0 && (
              <div className="rounded-2xl border border-[#d8d2c4] bg-[#ebe6da] p-5 md:p-8">
                <h2 className="text-xl font-semibold">
                  We're still learning your preferences.
                </h2>

                <p className="mt-2 max-w-xl text-[#687565]">
                  Add a few hikes or complete onboarding, and Talus will start building
                  recommendations around your preferences.
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

            {!loading && !error && ranking.length > 0 && (
              <div>
                <div className="mb-6 rounded-2xl border border-[#d8d2c4] bg-[#ebe6da] px-5 py-4">
                  <p className="text-sm leading-6 text-[#687565]">
                    Your recommendations improve as Talus learns from your
                    comparisons and completed hikes.
                  </p>
                </div>

                <div>
                  {ranking.slice(0, visibleCount).map((rankedTrail) => (
                    <TrailCard
                      key={rankedTrail.trail.id}
                      rankedTrail={rankedTrail}
                    />
                  ))}
                </div>

                <ShowMoreButton
                  shown={visibleCount}
                  total={ranking.length}
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export default Explore
