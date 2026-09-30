import {
  Mountain,
  Plus,
  Compass,
  Dna,
} from "lucide-react"

import { supabase } from "../services/supabase"

function Navigation() {
  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = "/auth"
  }

  return (
    <nav className="border-b border-[#d8d2c4] bg-[#f3efe4]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <a
          href="/"
          className="flex items-center gap-3"
          aria-label="Go to home"
        >
          <Mountain size={24} strokeWidth={1.8} />

          <span className="text-xl font-semibold tracking-tight">
            Talus
          </span>
        </a>

        <div className="flex items-center gap-2">
          <a
            href="/trails"
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-[#526052] transition hover:bg-[#e8e3d6]"
          >
            <Compass size={16} />
            Explore
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

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full px-4 py-2 text-sm font-medium text-[#687565] transition hover:bg-[#e8e3d6] hover:text-[#314936]"
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
