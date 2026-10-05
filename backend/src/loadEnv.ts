import fs from "node:fs"

const envPath = ".env"

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }

    const separator = trimmed.indexOf("=")

    if (separator === -1) {
      continue
    }

    const key = trimmed.slice(0, separator)
    const value = trimmed.slice(separator + 1)

    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}
