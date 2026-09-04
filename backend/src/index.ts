import express from 'express';
import cors from 'cors';

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json())

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok",
    application: "Talus",
   })
})

app.listen(PORT, () => {
    console.log(`Talus API running at http://localhost:${PORT}`)
})