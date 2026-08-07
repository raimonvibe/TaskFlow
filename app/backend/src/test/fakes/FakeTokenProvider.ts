import { UnauthorizedError } from '../../domain/errors/UnauthorizedError.js'
import type {
  TokenClaims,
  TokenProvider,
  TokenSubject,
} from '../../application/ports/ITokenProvider.js'

/**
 * `TokenProvider` that "signs" by JSON-encoding the claims. No crypto, no
 * secret, no expiry maths - the token is readable, so a failing test shows
 * you what was in it.
 *
 * Tests that need a specific failure (expired, malformed, ...) call
 * `rejectNext()`; the real signature/expiry rules belong to
 * `JwtTokenProvider` and are its own tests' business, not `TokenService`'s.
 */
export class FakeTokenProvider implements TokenProvider {
  private rejection: UnauthorizedError | null = null
  private issuedAt: number | null = null
  private expiresAt: number | null = null

  /** Fixes the `iat` claim on subsequently issued tokens (seconds since
   * epoch), so token-age assertions are deterministic. */
  issueAt(seconds: number): this {
    this.issuedAt = seconds
    return this
  }

  /** Fixes the `exp` claim on subsequently issued tokens. */
  expireAt(seconds: number): this {
    this.expiresAt = seconds
    return this
  }

  /** Makes the next `verify` throw, simulating a provider-level rejection. */
  rejectNext(error: UnauthorizedError): this {
    this.rejection = error
    return this
  }

  sign(subject: TokenSubject): string {
    return JSON.stringify({
      id: subject.id,
      email: subject.email,
      ...(this.issuedAt !== null && { iat: this.issuedAt }),
      ...(this.expiresAt !== null && { exp: this.expiresAt }),
    })
  }

  verify(token: string): TokenClaims {
    if (this.rejection) {
      const error = this.rejection
      this.rejection = null
      throw error
    }

    const claims = this.decode(token)
    if (!claims) {
      throw new UnauthorizedError('Invalid token')
    }
    return claims
  }

  decode(token: string): TokenClaims | null {
    try {
      return JSON.parse(token) as TokenClaims
    } catch {
      return null
    }
  }

  hashForRevocation(token: string): string {
    return `hash:${token}`
  }
}
