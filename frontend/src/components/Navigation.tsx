import { Link, useLocation } from "react-router"
import { Mountain } from "lucide-react"

import { navItems } from "./navItems"

function Navigation() {
  const { pathname } = useLocation()

  return (
    <nav className="sticky top-0 z-30 border-b border-[#d8d2c4] bg-[#f3efe4]/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:h-auto md:px-6 md:py-5">
        <Link
          to="/"
          className="flex items-center gap-2.5 md:gap-3"
          aria-label="Go to home"
        >
          <Mountain size={22} strokeWidth={1.8} />

          <span className="text-lg font-semibold tracking-tight md:text-xl">
            Talus
          </span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          {navItems
            .filter((item) => item.to !== "/")
            .map((item) => {
              const Icon = item.icon
              const active = item.matches(pathname)

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition hover:bg-[#e8e3d6] ${
                    active
                      ? "bg-[#e8e3d6] text-[#26352a]"
                      : "text-[#526052]"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              )
            })}
        </div>
      </div>
    </nav>
  )
}

export default Navigation
