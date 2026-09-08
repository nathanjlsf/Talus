import db from "./database.js"

const trails = [
  {
    name: "Lands End Trail",
    location: "San Francisco, California",
    description:
      "A coastal trail overlooking the Pacific Ocean and Golden Gate.",
    distance_miles: 3.4,
    estimated_time_minutes: 90,
    elevation_gain_feet: 538,
    difficulty: "Moderate",
    terrain: "Dirt",
    scenic_score: 0.95,
    nature_score: 0.7,
    solitude_score: 0.55,
    water_score: 1.0,
  },
  {
    name: "Tennessee Valley Trail",
    location: "Mill Valley, California",
    description:
      "A scenic coastal valley trail leading toward Tennessee Cove.",
    distance_miles: 3.4,
    estimated_time_minutes: 90,
    elevation_gain_feet: 425,
    difficulty: "Moderate",
    terrain: "Dirt",
    scenic_score: 0.92,
    nature_score: 0.75,
    solitude_score: 0.7,
    water_score: 1.0,
  },
  {
    name: "Mount Tamalpais",
    location: "Mill Valley, California",
    description:
      "Mountain trails with expansive Bay Area views and significant elevation.",
    distance_miles: 7.2,
    estimated_time_minutes: 240,
    elevation_gain_feet: 1800,
    difficulty: "Hard",
    terrain: "Mixed",
    scenic_score: 0.98,
    nature_score: 0.9,
    solitude_score: 0.65,
    water_score: 0.6,
  },
  {
    name: "Muir Woods",
    location: "Mill Valley, California",
    description:
      "A forest trail through a dramatic grove of coastal redwoods.",
    distance_miles: 2.2,
    estimated_time_minutes: 75,
    elevation_gain_feet: 300,
    difficulty: "Easy",
    terrain: "Paved",
    scenic_score: 0.88,
    nature_score: 1.0,
    solitude_score: 0.3,
    water_score: 0.1,
  },
  {
    name: "Dipsea Trail",
    location: "Mill Valley, California",
    description:
      "A challenging trail connecting redwood forests with coastal scenery.",
    distance_miles: 7.5,
    estimated_time_minutes: 270,
    elevation_gain_feet: 1800,
    difficulty: "Hard",
    terrain: "Mixed",
    scenic_score: 0.96,
    nature_score: 0.95,
    solitude_score: 0.7,
    water_score: 0.7,
  },
  {
    name: "Cataract Falls",
    location: "Mount Tamalpais, California",
    description:
      "A forested trail featuring waterfalls and rolling mountain terrain.",
    distance_miles: 7.7,
    estimated_time_minutes: 240,
    elevation_gain_feet: 1200,
    difficulty: "Moderate",
    terrain: "Rocky",
    scenic_score: 0.9,
    nature_score: 0.95,
    solitude_score: 0.75,
    water_score: 0.9,
  },
]

const insertTrail = db.prepare(`
  INSERT INTO trails (
    name,
    location,
    description,
    distance_miles,
    estimated_time_minutes,
    elevation_gain_feet,
    difficulty,
    terrain,
    scenic_score,
    nature_score,
    solitude_score,
    water_score
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const seed = db.transaction(() => {
  db.prepare("DELETE FROM trails").run()

  for (const trail of trails) {
    insertTrail.run(
      trail.name,
      trail.location,
      trail.description,
      trail.distance_miles,
      trail.estimated_time_minutes,
      trail.elevation_gain_feet,
      trail.difficulty,
      trail.terrain,
      trail.scenic_score,
      trail.nature_score,
      trail.solitude_score,
      trail.water_score
    )
  }
})

seed()

console.log(`Seeded ${trails.length} trails.`)
