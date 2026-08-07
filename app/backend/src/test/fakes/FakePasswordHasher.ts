import type { PasswordHasher } from '../../application/ports/IPasswordHasher.js'

const PREFIX = 'hashed:'

/**
 * Reversible, instant stand-in for bcrypt.
 *
 * Real bcrypt at cost factor 10 takes ~100ms per call by design, which is
 * the right trade for production and the wrong one for a unit test that
 * only needs "the same password verifies, a different one does not". Using
 * a fake here is what keeps the `AuthService` suite in the millisecond
 * range; bcrypt itself is exercised by the integration tests.
 *
 * Obviously not a hash. That is deliberate - nothing about it should ever
 * look usable outside a test.
 */
export class FakePasswordHasher implements PasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return `${PREFIX}${plainPassword}`
  }

  async compare(plainPassword: string, passwordHash: string): Promise<boolean> {
    return passwordHash === `${PREFIX}${plainPassword}`
  }
}
