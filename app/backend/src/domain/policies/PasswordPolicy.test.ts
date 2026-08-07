import { describe, it, expect } from 'vitest'
import { LengthPasswordPolicy, StrongPasswordPolicy } from './PasswordPolicy.js'

describe('LengthPasswordPolicy', () => {
  const policy = new LengthPasswordPolicy()

  it('states the rule in the exact words the route used to hard-code', () => {
    // The 400 body for a short password is part of the wire format, and the
    // frontend shows it verbatim. Changing it here changes what users read.
    expect(policy.requirement).toBe('Password must be between 8 and 128 characters')
  })

  it.each([
    ['exactly the minimum', 'a'.repeat(8)],
    ['comfortably inside', 'ValidPass123'],
    ['exactly the maximum', 'a'.repeat(128)],
  ])('accepts a password %s', (_label, password) => {
    expect(policy.violations(password)).toEqual([])
  })

  it.each([
    ['one short of the minimum', 'a'.repeat(7)],
    ['empty', ''],
    ['one past the maximum', 'a'.repeat(129)],
  ])('rejects a password %s', (_label, password) => {
    expect(policy.violations(password)).toEqual(['Password must be between 8 and 128 characters'])
  })

  it('can be constructed with different bounds, and says so', () => {
    const strict = new LengthPasswordPolicy(16, 64)

    expect(strict.requirement).toBe('Password must be between 16 and 64 characters')
    expect(strict.violations('ValidPass123')).toHaveLength(1)
  })
})

describe('StrongPasswordPolicy', () => {
  const policy = new StrongPasswordPolicy()

  it('accepts a password meeting every rule', () => {
    expect(policy.violations('CorrectHorse9Battery')).toEqual([])
  })

  it('reports every failing rule at once rather than the first', () => {
    // One round trip should be enough to learn everything that is wrong.
    expect(policy.violations('short')).toEqual([
      'Password must be between 12 and 128 characters',
      'Password must include an uppercase letter',
      'Password must include a number',
    ])
  })

  it.each([
    ['no uppercase', 'lowercaseonly9', 'Password must include an uppercase letter'],
    ['no lowercase', 'UPPERCASEONLY9', 'Password must include a lowercase letter'],
    ['no digit', 'NoDigitsInHere', 'Password must include a number'],
  ])('rejects a long password with %s', (_label, password, expected) => {
    expect(policy.violations(password)).toEqual([expected])
  })

  it('is stricter than the default, which is the point of choosing it', () => {
    const acceptedByDefault = 'password'

    expect(new LengthPasswordPolicy().violations(acceptedByDefault)).toEqual([])
    expect(policy.violations(acceptedByDefault).length).toBeGreaterThan(0)
  })
})
