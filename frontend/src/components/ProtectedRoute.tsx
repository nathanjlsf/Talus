import { useEffect, useState } from "react"
import { getCurrentUser } from "../services/supabase"

type ProtectedRouteProps = {
  children: React.ReactNode
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      try {
        const user = await getCurrentUser()
        setAuthenticated(Boolean(user))
      } catch {
        setAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f1e8] text-[#526052]">
        Loading...
      </div>
    )
  }

  if (!authenticated) {
    window.location.href = "/auth"
    return null
  }

  return <>{children}</>
}

export default ProtectedRoute
