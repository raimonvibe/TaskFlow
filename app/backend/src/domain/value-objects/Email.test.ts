import { describe, it, expect } from 'vitest'
import { Email } from './Email.js'
import { ValidationError } from '../errors/ValidationError.js'

describe('Email value object', () => {
  it('accepts a well-formed address', () => {
    const email = Email.create('stefan@example.com')
    expect(email.value).toBe('stefan@example.com')
  })

  it('normalizes case and surrounding whitespace', () => {
    const email = Email.create('  Stefan@Example.COM  ')
    expect(email.value).toBe('stefan@example.com')
  })

  it('two emails differing only by case/whitespace are equal', () => {
    const a = Email.create('stefan@example.com')
    const b = Email.create(' STEFAN@EXAMPLE.com')
    expect(a.equals(b)).toBe(true)
  })

  it('rejects a string with no @', () => {
    expect(() => Email.create('not-an-email')).toThrow(ValidationError)
  })

  it('rejects a string with whitespace in the middle', () => {
    expect(() => Email.create('ste fan@example.com')).toThrow(ValidationError)
  })

  it('rejects a string with no domain', () => {
    expect(() => Email.create('stefan@')).toThrow(ValidationError)
  })

  it('rejects an empty string', () => {
    expect(() => Email.create('')).toThrow(ValidationError)
  })

  it('accepts a multi-label domain', () => {
    expect(Email.create('stefan@mail.example.co.uk').value).toBe('stefan@mail.example.co.uk')
  })

  it('rejects an empty domain label', () => {
    expect(() => Email.create('stefan@example..com')).toThrow(ValidationError)
  })

  it('rejects an address longer than the RFC 5321 limit of 254 characters', () => {
    const tooLong = `${'a'.repeat(250)}@example.com`
    expect(tooLong.length).toBeGreaterThan(254)
    expect(() => Email.create(tooLong)).toThrow(ValidationError)
  })

  // The ReDoS input for the old `[^\s@]+\.[^\s@]+` domain part - many dots to
  // backtrack over, then a space so the final segment always fails - is only
  // slow at tens of kilobytes, and MAX_EMAIL_LENGTH now rejects that before
  // the regex ever runs. So this asserts the length guard short-circuits
  // rather than asserting a duration: a timing budget here would pass no
  // matter how ambiguous the pattern became, which is a worse guard than none.
  it('rejects a long backtracking-bait address on length, before matching', () => {
    const attack = `a@${'b.'.repeat(40_000)}c d`
    const started = performance.now()
    expect(() => Email.create(attack)).toThrow(ValidationError)
    expect(performance.now() - started).toBeLessThan(50)
  })

  it('the thrown error carries field-level details for the API layer to surface', () => {
    try {
      Email.create('nope')
      expect.unreachable('Email.create should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError)
      expect((err as ValidationError).details).toEqual([
        { field: 'email', message: 'Valid email is required' },
      ])
    }
  })

  it('serializes to its plain string value via toString/toJSON (e.g. inside JSON.stringify)', () => {
    const email = Email.create('stefan@example.com')
    expect(email.toString()).toBe('stefan@example.com')
    expect(JSON.stringify({ email })).toBe('{"email":"stefan@example.com"}')
  })
})
