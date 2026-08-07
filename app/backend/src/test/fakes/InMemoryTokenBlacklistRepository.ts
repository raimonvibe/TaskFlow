import type { TokenBlacklistRepository } from '../../domain/repositories/ITokenBlacklistRepository.js'

/** In-memory `TokenBlacklistRepository`. `deleteExpired` needs a notion of
 * "now" to be meaningful, so it takes the same instant the test's clock
 * uses rather than reading the real one. */
export class InMemoryTokenBlacklistRepository implements TokenBlacklistRepository {
  private readonly revoked = new Map<string, Date>()

  constructor(private readonly now: () => Date = () => new Date()) {}

  async add(tokenHash: string, expiresAt: Date): Promise<void> {
    if (!this.revoked.has(tokenHash)) {
      this.revoked.set(tokenHash, expiresAt)
    }
  }

  async isBlacklisted(tokenHash: string): Promise<boolean> {
    return this.revoked.has(tokenHash)
  }

  async deleteExpired(): Promise<void> {
    const cutoff = this.now().getTime()
    for (const [hash, expiresAt] of this.revoked) {
      if (expiresAt.getTime() < cutoff) {
        this.revoked.delete(hash)
      }
    }
  }

  /** Test helper. */
  get size(): number {
    return this.revoked.size
  }
}
