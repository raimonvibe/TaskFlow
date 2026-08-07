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
