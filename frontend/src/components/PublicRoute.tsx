import { useEffect, useState } from "react"
import { getCurrentUser } from "../services/supabase"

type PublicRouteProps = {
  children: React.ReactNode
}

function PublicRoute({ children }: PublicRouteProps) {
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

  if (authenticated) {
    window.location.href = "/"
    return null
  }

  return <>{children}</>
}

export default PublicRoute
