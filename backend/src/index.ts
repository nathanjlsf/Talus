import "./loadEnv.js"
import express from "express"
import cors from "cors"

import db from "./db/database.js"
import trailRoutes from "./routes/trails.js"
import comparisonRoutes from "./routes/comparisons.js"
import preferenceRoutes from "./routes/preferences.js"
import activityRoutes from "./routes/activities.js"
import experienceRoutes from "./routes/experiences.js"
import usersRouter from "./routes/users.js"
import { backfillEstimatedDifficulty } from "./import/osm/applyEstimatedDifficulty.js"
import { backfillMissingPreferredRanges } from "./services/preferenceService.js"
import { backfillTrailBounds } from "./repositories/trailGeometryRepository.js"

const app = express()
const PORT = Number(process.env.PORT) || 3000

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173"

app.use(
  cors({
    origin: [
      FRONTEND_URL,
      "https://localhost",
      "http://localhost",
      "capacitor://localhost",
    ],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)

app.use(express.json())

app.get("/api/health", (_req, res) => {
  const result = db
    .prepare("SELECT 1 as healthy")
    .get()

  res.json({
    status: "ok",
    application: "Talus",
    database: result,
  })
})

app.use("/api/trails", trailRoutes)
app.use("/api/comparisons", comparisonRoutes)
app.use("/api/preferences", preferenceRoutes)
app.use("/api/activities", activityRoutes)
app.use("/api/experiences", experienceRoutes)
app.use("/api/users", usersRouter)

try {
  const estimated =
    backfillEstimatedDifficulty()

  const preferences =
    backfillMissingPreferredRanges()

  const bounds = backfillTrailBounds()

  if (
    estimated > 0 ||
    preferences > 0 ||
    bounds > 0
  ) {
    console.log(
      `Backfilled ${estimated} trail difficulties, ${preferences} preference profiles, and ${bounds} trail bounds.`
    )
  }
} catch (error) {
  console.error(
    "Startup backfill failed:",
    error
  )
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Talus API running on port ${PORT}`)
})