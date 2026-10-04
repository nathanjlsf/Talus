import { Outlet, useLocation } from "react-router"

import Navigation from "./Navigation"
import TabBar from "./TabBar"

function Layout() {
  const { pathname } = useLocation()
  const isImmersive =
    pathname === "/map" || pathname === "/record"

  return (
    <div
      className={
        isImmersive
          ? "flex h-dvh flex-col overflow-hidden bg-[#f3efe4] text-[#26352a]"
          : "min-h-screen bg-[#f3efe4] text-[#26352a]"
      }
    >
      <Navigation />

      <main
        className={
          isImmersive
            ? "relative min-h-0 flex-1"
            : "mx-auto max-w-6xl px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-6 md:py-12"
        }
      >
        <Outlet />
      </main>

      <TabBar />
    </div>
  )
}

export default Layout
