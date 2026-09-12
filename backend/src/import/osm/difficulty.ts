const SAC_SCALE_TO_DIFFICULTY: Record<
  string,
  string
> = {
  strolling: "Easy",
  hiking: "Easy",
  mountain_hiking: "Moderate",
  demanding_mountain_hiking: "Hard",
  alpine_hiking: "Hard",
  demanding_alpine_hiking: "Hard",
  difficult_alpine_hiking: "Hard",
}

export function difficultyFromSacScale(
  sacScale: string | undefined
): string | null {
  if (!sacScale) {
    return null
  }

  return (
    SAC_SCALE_TO_DIFFICULTY[
      sacScale.toLowerCase()
    ] ?? null
  )
}
