import { ValidationError } from '../errors/ValidationError.js'

// Deliberately pragmatic, not a full RFC 5322 implementation - "perfectly"
// validating email addresses by regex is a well-known rabbit hole, and this
// app doesn't need more than "looks like an email, no whitespace, exactly
// one @". express-validator's `isEmail()` (still used at the route
// boundary) is more permissive/complete; if real-world addresses ever
// get rejected here that shouldn't be, tighten this regex rather than
// reaching for a full RFC implementation.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Encapsulates "what is a valid email" and "how do we normalize one" in one
 * place, instead of the old pattern of calling express-validator's
 * `isEmail().normalizeEmail()` at the route boundary and then trusting the
 * resulting string everywhere downstream. Two emails that differ only by
 * case or surrounding whitespace are the same address.
 */
export class Email {
  readonly value: string

  private constructor(value: string) {
    this.value = value
  }

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase()

    if (!EMAIL_PATTERN.test(normalized)) {
      throw new ValidationError('Valid email is required', [
        { field: 'email', message: 'Valid email is required' },
      ])
    }

    return new Email(normalized)
  }

  equals(other: Email): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }

  toJSON(): string {
    return this.value
  }
}
