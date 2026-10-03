import { Link, useNavigate } from "react-router"
import {
  ChevronRight,
  Dna,
  History,
  LogOut,
  Scale,
  type LucideIcon,
} from "lucide-react"

import { supabase } from "../services/supabase"

const links: {
  to: string
  label: string
  description: string
  icon: LucideIcon
}[] = [
  {
    to: "/hike-dna",
    label: "Hike DNA",
    description: "What Talus has learned about your hiking style",
    icon: Dna,
  },
  {
    to: "/activities",
    label: "Your hikes",
    description: "Every hike you've logged and reviewed",
    icon: History,
  },
  {
    to: "/compare",
    label: "Compare trails",
    description: "Teach Talus more about what you like",
    icon: Scale,
  },
]

function Profile() {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate("/auth", { replace: true })
  }

  return (
    <section className="mx-auto max-w-2xl">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#687565]">
        Profile
      </p>

      <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
        You
      </h1>

      <div className="mt-8 divide-y divide-[#d8d2c4] overflow-hidden rounded-3xl border border-[#d8d2c4] bg-[#ebe6da]">
        {links.map((link) => {
          const Icon = link.icon

          return (
            <Link
              key={link.to}
              to={link.to}
              className="flex min-h-16 items-center gap-4 px-5 py-4 transition hover:bg-[#e4dfd2]"
            >
              <div className="rounded-full bg-[#314936] p-2.5 text-white">
                <Icon size={18} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-medium">{link.label}</p>

                <p className="mt-0.5 text-sm text-[#687565]">
                  {link.description}
                </p>
              </div>

              <ChevronRight
                size={18}
                className="shrink-0 text-[#8a9184]"
              />
            </Link>
          )
        })}
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#c9c4b7] px-5 py-3 font-medium text-[#687565] transition hover:border-[#314936] hover:text-[#314936]"
      >
        <LogOut size={17} />
        Log out
      </button>
    </section>
  )
}

export default Profile
