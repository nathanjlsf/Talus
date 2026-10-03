import { Link } from "react-router"
import { Compass, Map as MapIcon } from "lucide-react"

function MapPage() {
  return (
    <section className="mx-auto max-w-2xl">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#687565]">
        Map
      </p>

      <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
        Trail map
      </h1>

      <div className="mt-8 rounded-3xl border border-[#d8d2c4] bg-[#ebe6da] p-5 md:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#314936] text-white">
          <MapIcon size={22} />
        </div>

        <h2 className="mt-5 text-xl font-semibold md:text-2xl">
          The trail map is on its way.
        </h2>

        <p className="mt-2 leading-7 text-[#687565]">
          You'll be able to browse every trail around you on a map,
          colored by how well it matches your Hike DNA.
        </p>
      </div>

      <Link
        to="/trails"
        className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#314936] px-6 py-3 font-medium text-white transition hover:bg-[#263b2b]"
      >
        <Compass size={18} />
        Explore trails
      </Link>
    </section>
  )
}

export default MapPage
