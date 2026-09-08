import Layout from "./components/Layout"
import Rankings from "./pages/Rankings"
import Compare from "./pages/Compare"
import AddHike from "./pages/AddHike"
import HikeDNA from "./pages/HikeDNA"
import TrailDetail from "./pages/TrailDetail"
import Home from "./pages/Home"
import Activities from "./pages/Activities"
import Onboarding from "./pages/Onboarding"

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
  } else {
    page = <Rankings />
  }

  return <Layout>{page}</Layout>
}

export default App
