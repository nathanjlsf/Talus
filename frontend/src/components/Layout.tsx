import { Outlet } from "react-router"

import Navigation from "./Navigation"
import TabBar from "./TabBar"

function Layout() {
  return (
    <div className="min-h-screen bg-[#f3efe4] text-[#26352a]">
      <Navigation />

      <main className="mx-auto max-w-6xl px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-6 md:py-12">
        <Outlet />
      </main>

      <TabBar />
    </div>
  )
}

export default Layout
