import type { ReactNode } from "react"

interface StickyActionBarProps {
  children: ReactNode
  className?: string
}

// Phones pin the action just above the fixed tab bar (h-16 plus the home-indicator inset).
function StickyActionBar({
  children,
  className = "",
}: StickyActionBarProps) {
  return (
    <div
      className={`sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 md:static ${className}`}
    >
      {children}
    </div>
  )
}

export default StickyActionBar
