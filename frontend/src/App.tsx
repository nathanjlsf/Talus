import { Navigate, Route, Routes } from "react-router"

import Layout from "./components/Layout"
import Explore from "./pages/Explore"
import Compare from "./pages/Compare"
import AddHike from "./pages/AddHike"
import HikeDNA from "./pages/HikeDNA"
import TrailDetail from "./pages/TrailDetail"
import Home from "./pages/Home"
import Activities from "./pages/Activities"
import HikeSummary from "./pages/HikeSummary"
import Onboarding from "./pages/Onboarding"
import Experience from "./pages/Experience"
import PastHikes from "./pages/PastHikes"
import OnboardingExperiences from "./pages/OnboardingExperiences"
import Auth from "./pages/Auth"
import MapPage from "./pages/MapPage"
import Record from "./pages/Record"
import Profile from "./pages/Profile"
import ProtectedRoute from "./components/ProtectedRoute"
import PublicRoute from "./components/PublicRoute"

function App() {
  return (
    <Routes>
      <Route
        path="/auth"
        element={
          <PublicRoute>
            <Auth />
          </PublicRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="trails" element={<Explore />} />
        <Route path="trails/:trailId" element={<TrailDetail />} />
        <Route path="map" element={<MapPage />} />
        <Route path="record" element={<Record />} />
        <Route path="profile" element={<Profile />} />
        <Route path="compare" element={<Compare />} />
        <Route path="add-hike" element={<AddHike />} />
        <Route path="hike-dna" element={<HikeDNA />} />
        <Route path="activities" element={<Activities />} />
        <Route path="activities/:activityId" element={<HikeSummary />} />
        <Route
          path="activities/:activityId/experience"
          element={<Experience />}
        />
        <Route path="onboarding" element={<Onboarding />} />
        <Route path="onboarding/hikes" element={<PastHikes />} />
        <Route
          path="onboarding/experiences"
          element={<OnboardingExperiences />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
