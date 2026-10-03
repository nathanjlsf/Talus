import { Link, useLocation } from "react-router"

import { navItems } from "./navItems"

function TabBar() {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[#d8d2c4] bg-[#f3efe4]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="mx-auto flex h-16 max-w-md items-stretch justify-around">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = item.matches(pathname)

          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
                active
                  ? "text-[#26352a]"
                  : "text-[#8a9184]"
              }`}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.2 : 1.8}
              />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default TabBar
