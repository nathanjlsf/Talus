import express from "express"
import cors from "cors"

import db from "./db/database.js"
import trailRoutes from "./routes/trails.js"

const app = express()
const PORT = 3000

app.use(cors())
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

app.listen(PORT, () => {
  console.log(`Talus API running at http://localhost:${PORT}`)
})