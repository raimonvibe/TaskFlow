import { ValidationError } from '../errors/ValidationError.js'

// Deliberately pragmatic, not a full RFC 5322 implementation - "perfectly"
// validating email addresses by regex is a well-known rabbit hole, and this
// app doesn't need more than "looks like an email, no whitespace, exactly
// one @". express-validator's `isEmail()` (still used at the route
// boundary) is more permissive/complete; if real-world addresses ever
// get rejected here that shouldn't be, tighten this regex rather than
// reaching for a full RFC implementation.
//
// The domain part is spelled as "dot-free label, then one or more
// dot-prefixed labels" rather than the more obvious `[^\s@]+\.[^\s@]+`.
// That shorter form is ambiguous: `[^\s@]` matches `.` too, so on a long
// dotless domain the engine retries every split point looking for the
// literal dot, which is quadratic in the length of the input (CodeQL
// js/polynomial-redos). Excluding `.` from the label class makes each
// character match exactly one way, so this runs in linear time.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/

// RFC 5321 caps a full address at 254 characters. Enforced before the regex
// so absurd input is rejected by a length check rather than by pattern
// matching, and so the database never sees an address it cannot store.
const MAX_EMAIL_LENGTH = 254

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

    if (normalized.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(normalized)) {
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
