import { useEffect, useState } from "react"

import TrailCard from "../components/TrailCard"
import {
  getRanking,
  type RankedTrail,
} from "../services/api"

function Rankings() {
  const [ranking, setRanking] = useState<RankedTrail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    </section>
  )
}

export default Rankings
