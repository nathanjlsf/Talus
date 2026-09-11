export interface ElevationSample {
  elevation_feet: number
}

const MIN_GAIN_FEET = 5

export function calculateElevationGain(
  samples: ElevationSample[]
): number {
  if (samples.length < 2) {
    return 0
  }

  let gain = 0
  let accumulatedClimb = 0

  for (
    let index = 1;
    index < samples.length;
    index++
  ) {
    const previous =
      samples[index - 1]!.elevation_feet

    const current =
      samples[index]!.elevation_feet

    const difference =
      current - previous

    if (difference > 0) {
      accumulatedClimb += difference
      continue
    }

    if (accumulatedClimb >= MIN_GAIN_FEET) {
      gain += accumulatedClimb
    }

    accumulatedClimb = 0
  }

  if (accumulatedClimb >= MIN_GAIN_FEET) {
    gain += accumulatedClimb
  }

  return Math.round(gain)
}
