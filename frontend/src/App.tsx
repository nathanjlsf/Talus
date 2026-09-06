import Layout from "./components/Layout"
import Rankings from "./pages/Rankings"
import Compare from "./pages/Compare"
import AddHike from "./pages/AddHike"
import HikeDNA from "./pages/HikeDNA"

function App() {
  const path = window.location.pathname

  let page

  if (path === "/compare") {
    page = <Compare />
  } else if (path === "/add-hike") {
    page = <AddHike />
  } else if (path === "/hike-dna") {
    page = <HikeDNA />
  } else {
    page = <Rankings />
  }

  return <Layout>{page}</Layout>
}

export default App