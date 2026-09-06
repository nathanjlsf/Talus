import {
  Mountain,
  Plus,
  Scale,
  Dna,
} from "lucide-react"

function Navigation() {
  return (
    <nav className="border-b border-[#d8d2c4] bg-[#f3efe4]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <Mountain size={24} strokeWidth={1.8} />

          <span className="text-xl font-semibold tracking-tight">
            Talus
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/"
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-[#526052] transition hover:bg-[#e8e3d6]"
          >
            Rankings
          </a>

          <a
            href="/compare"
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-[#526052] transition hover:bg-[#e8e3d6]"
          >
            <Scale size={16} />
            Compare
          </a>

          <a
            href="/add-hike"
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-[#526052] transition hover:bg-[#e8e3d6]"
          >
            <Plus size={16} />
            Add Hike
          </a>

          <a
            href="/hike-dna"
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-[#526052] transition hover:bg-[#e8e3d6]"
          >
            <Dna size={16} />
            Hike DNA
          </a>
        </div>
      </div>
    </nav>
  )
}

export default Navigation