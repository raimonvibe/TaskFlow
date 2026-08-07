import { describe, it, expect } from 'vitest'
import { parseDurationToMs, parseDurationToSeconds } from './parseDuration.js'

describe('parseDuration', () => {
  it('parses the jsonwebtoken-style units', () => {
    expect(parseDurationToMs('15m')).toBe(15 * 60 * 1000)
    expect(parseDurationToMs('7d')).toBe(7 * 24 * 60 * 60 * 1000)
    expect(parseDurationToMs('1h')).toBe(60 * 60 * 1000)
    expect(parseDurationToSeconds('15m')).toBe(15 * 60)
  })

  it('rejects an unrecognized form', () => {
    expect(() => parseDurationToMs('15 minutes')).toThrow(/Invalid duration/)
  })
})
