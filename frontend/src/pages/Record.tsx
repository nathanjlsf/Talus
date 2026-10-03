import { Link } from "react-router"
import { Circle, Plus } from "lucide-react"

function Record() {
  return (
    <section className="mx-auto max-w-2xl">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#687565]">
        Record
      </p>

      <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
        Track a hike
      </h1>

      <div className="mt-8 rounded-3xl border border-[#d8d2c4] bg-[#ebe6da] p-5 md:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#314936] text-white">
          <Circle size={22} />
        </div>

        <h2 className="mt-5 text-xl font-semibold md:text-2xl">
          Live GPS tracking is coming soon.
        </h2>

        <p className="mt-2 leading-7 text-[#687565]">
          Soon Talus will follow your route, measure distance and
          elevation as you go, and show your stats when you finish.
        </p>
      </div>

      <Link
        to="/add-hike"
        className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#314936] px-6 py-3 font-medium text-white transition hover:bg-[#263b2b]"
      >
        <Plus size={18} />
        Log a past hike
      </Link>
    </section>
  )
}

export default Record
