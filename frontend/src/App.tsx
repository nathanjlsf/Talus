import Layout from "./components/Layout"
import Rankings from "./pages/Rankings"
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

function App() {
  const path = window.location.pathname

  let page

  if (path === "/") {
    page = <Home />
  } else if (path.startsWith("/trails/")) {
    page = <TrailDetail />
  } else if (path === "/onboarding") {
    page = <Onboarding />
  } else if (path === "/compare") {
    page = <Compare />
  } else if (path === "/add-hike") {
    page = <AddHike />
  } else if (path === "/hike-dna") {
    page = <HikeDNA />
  } else if (path === "/activities") {
    page = <Activities />
  } else if (path.startsWith("/activities/") && path.endsWith("/experience")) {
    page = <Experience />
  } else if (path === "/onboarding/hikes") {
    page = <PastHikes />
  } else if (path === "/onbaording/experiences") {
    page = <OnboardingExperiences />
  } else {
    page = <Rankings />
  }

  return <Layout>{page}</Layout>
}

export default App
