import db from "./database.js"

const trails = [
  {
    name: "Lands End Trail",
    location: "San Francisco, California",
    description:
      "A coastal trail overlooking the Pacific Ocean and Golden Gate.",
    distance_miles: 3.4,
    elevation_gain_feet: 538,
    difficulty: "Moderate",
    scenic_score: 0.95,
    forest_score: 0.35,
    coastal_score: 1.0,
    solitude_score: 0.55,
  },
  {
    name: "Tennessee Valley Trail",
    location: "Mill Valley, California",
    description:
      "A scenic coastal valley trail leading toward Tennessee Cove.",
    distance_miles: 3.4,
    elevation_gain_feet: 425,
    difficulty: "Moderate",
    scenic_score: 0.92,
    forest_score: 0.45,
    coastal_score: 0.95,
    solitude_score: 0.7,
  },
  {
    name: "Mount Tamalpais",
    location: "Mill Valley, California",
    description:
      "Mountain trails with expansive Bay Area views and significant elevation.",
    distance_miles: 7.2,
    elevation_gain_feet: 1800,
    difficulty: "Hard",
    scenic_score: 0.98,
    forest_score: 0.8,
    coastal_score: 0.7,
    solitude_score: 0.65,
  },
  {
    name: "Muir Woods",
    location: "Mill Valley, California",
    description:
      "A forest trail through a dramatic grove of coastal redwoods.",
    distance_miles: 2.2,
    elevation_gain_feet: 300,
    difficulty: "Easy",
    scenic_score: 0.88,
    forest_score: 1.0,
    coastal_score: 0.2,
    solitude_score: 0.3,
  },
  {
    name: "Dipsea Trail",
    location: "Mill Valley, California",
    description:
      "A challenging trail connecting redwood forests with coastal scenery.",
    distance_miles: 7.5,
    elevation_gain_feet: 1800,
    difficulty: "Hard",
    scenic_score: 0.96,
    forest_score: 0.85,
    coastal_score: 0.8,
    solitude_score: 0.7,
  },
  {
    name: "Cataract Falls",
    location: "Mount Tamalpais, California",
    description:
      "A forested trail featuring waterfalls and rolling mountain terrain.",
    distance_miles: 7.7,
    elevation_gain_feet: 1200,
    difficulty: "Moderate",
    scenic_score: 0.9,
    forest_score: 0.95,
    coastal_score: 0.25,
    solitude_score: 0.75,
  },
]

const insertTrail = db.prepare(`
  INSERT INTO trails (
    name,
    location,
    description,
    distance_miles,
    elevation_gain_feet,
    difficulty,
    scenic_score,
    forest_score,
    coastal_score,
    solitude_score
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const seed = db.transaction(() => {
  db.prepare("DELETE FROM trails").run()

  for (const trail of trails) {
    insertTrail.run(
      trail.name,
      trail.location,
      trail.description,
      trail.distance_miles,
      trail.elevation_gain_feet,
      trail.difficulty,
      trail.scenic_score,
      trail.forest_score,
      trail.coastal_score,
      trail.solitude_score
    )
  }
})

seed()

console.log(`Seeded ${trails.length} trails.`)