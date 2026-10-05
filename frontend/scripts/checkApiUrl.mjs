import fs from "node:fs"

const file = fs
  .readdirSync("dist/assets")
  .find((name) => name.startsWith("index-") && name.endsWith(".js"))

if (!file) {
  console.error("No built index bundle.")
  process.exit(1)
}

const text = fs.readFileSync(`dist/assets/${file}`, "utf8")
const expected = "https://talus-hiking.fly.dev/api"

if (!text.includes(expected)) {
  console.error(`Phone bundle is missing ${expected}`)
  process.exit(1)
}

if (text.includes("localhost:3000")) {
  console.error("Phone bundle still points at localhost:3000")
  process.exit(1)
}

console.log(`${file} uses ${expected}`)
