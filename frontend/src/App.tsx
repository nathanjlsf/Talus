import Layout from "./components/Layout"
import Explore from "./pages/Explore"
import Compare from "./pages/Compare"
import AddHike from "./pages/AddHike"
import HikeDNA from "./pages/HikeDNA"
import TrailDetail from "./pages/TrailDetail"
import Home from "./pages/Home"
import Activities from "./pages/Activities"
import Onboarding from "./pages/Onboarding"
import Experience from "./pages/Experience"
import PastHikes from "./pages/PastHikes"
import OnboardingExperiences from "./pages/OnboardingExperiences"
import Auth from "./pages/Auth"
import ProtectedRoute from "./components/ProtectedRoute"
import PublicRoute from "./components/PublicRoute"

function App() {
  const path = window.location.pathname

  let page

  if (path === "/auth") {
    page = (
      <PublicRoute>
        <Auth />
      </PublicRoute>)
  } else if (path === "/") {
    page = (
      <ProtectedRoute>
        <Home />
      </ProtectedRoute>)
  } else if (path.startsWith("/trails/")) {
    page = (
      <ProtectedRoute>
        <TrailDetail />
      </ProtectedRoute>
    )
  } else if (path === "/onboarding") {
    page = (
      <ProtectedRoute>
        <Onboarding />
      </ProtectedRoute>
    )
  } else if (path === "/compare") {
    page = (
      <ProtectedRoute>
        <Compare />
      </ProtectedRoute>
    )
  } else if (path === "/add-hike") {
    page = (
      <ProtectedRoute>
        <AddHike />
      </ProtectedRoute>
    )
  } else if (path === "/hike-dna") {
    page = (
      <ProtectedRoute>
        <HikeDNA />
      </ProtectedRoute>
    )
  } else if (path === "/activities") {
    page = (
      <ProtectedRoute>
        <Activities />
      </ProtectedRoute>
    )
  } else if (path.startsWith("/activities/") && path.endsWith("/experience")) {
    page = (
      <ProtectedRoute>
        <Experience />
      </ProtectedRoute>
    )
  } else if (path === "/onboarding/hikes") {
    page = (
      <ProtectedRoute>
        <PastHikes />
      </ProtectedRoute>
    )
  } else if (path === "/onboarding/experiences") {
    page = (
      <ProtectedRoute>
        <OnboardingExperiences />
      </ProtectedRoute>
    )
  } else {
    page = (
      <ProtectedRoute>
        <Explore />
      </ProtectedRoute>
    )
  }

  return <Layout>{page}</Layout>
}

export default App
