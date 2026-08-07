const UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
}

/**
 * Parses the same duration strings `jsonwebtoken` accepts for `expiresIn`
 * (`15m`, `7d`, `1h`, …) into milliseconds. Used so Config's JWT lifetimes
 * and the refresh-token row's `expires_at` share one vocabulary.
 */
export function parseDurationToMs(spec: string): number {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(spec.trim())
  if (!match) {
    throw new Error(
      `Invalid duration "${spec}". Expected a number followed by ms, s, m, h, or d (e.g. "15m", "7d").`
    )
  }
  const amount = parseInt(match[1]!, 10)
  const unit = match[2]!
  return amount * UNIT_MS[unit]!
}

export function parseDurationToSeconds(spec: string): number {
  return Math.floor(parseDurationToMs(spec) / 1000)
}
