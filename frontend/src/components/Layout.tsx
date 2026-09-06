import type { ReactNode } from "react"

import Navigation from "./Navigation"

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#f3efe4] text-[#26352a]">
      <Navigation />

      <main className="mx-auto max-w-6xl px-6 py-12">
        {children}
      </main>
    </div>
  )
}

export default Layout