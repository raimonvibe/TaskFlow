import { describe, it, expect, beforeEach } from 'vitest'
import { TokenService } from './TokenService.js'
import { UnauthorizedError } from '../../domain/errors/UnauthorizedError.js'
import { FakeTokenProvider } from '../../test/fakes/FakeTokenProvider.js'
import { FixedClock } from '../../test/fakes/FixedClock.js'
import { InMemoryTokenBlacklistRepository } from '../../test/fakes/InMemoryTokenBlacklistRepository.js'
import { RecordingLogger } from '../../test/fakes/RecordingLogger.js'

const NOW = new Date('2026-06-01T12:00:00.000Z')
const NOW_SECONDS = Math.floor(NOW.getTime() / 1000)
const ACCESS_MAX_AGE_SECONDS = 15 * 60

describe('TokenService', () => {
  let provider: FakeTokenProvider
  let blacklist: InMemoryTokenBlacklistRepository
  let logger: RecordingLogger
  let service: TokenService

  beforeEach(() => {
    provider = new FakeTokenProvider()
    blacklist = new InMemoryTokenBlacklistRepository(() => NOW)
    logger = new RecordingLogger()
    service = new TokenService(provider, blacklist, new FixedClock(NOW), logger, {
      maxAgeSeconds: ACCESS_MAX_AGE_SECONDS,
    })
  })

  describe('verify', () => {
    it('returns the claims for a valid token', async () => {
      const token = provider.issueAt(NOW_SECONDS).sign({ id: 7, email: 'ada@example.com' })

      const claims = await service.verify(token)

      expect(claims.id).toBe(7)
      expect(claims.email).toBe('ada@example.com')
    })

    it('rejects a revoked token before checking anything else', async () => {
      const token = provider.issueAt(NOW_SECONDS).sign({ id: 7, email: 'ada@example.com' })
      await service.revoke(token)

      // Even a token that would otherwise verify perfectly must be rejected
      // once revoked - that ordering is the whole point of logout.
      await expect(service.verify(token)).rejects.toThrow(
        new UnauthorizedError('Token has been revoked')
      )
    })

    it('surfaces the provider rejection unchanged', async () => {
      const token = provider.issueAt(NOW_SECONDS).sign({ id: 7, email: 'ada@example.com' })
      provider.rejectNext(new UnauthorizedError('Token expired'))

      await expect(service.verify(token)).rejects.toThrow(new UnauthorizedError('Token expired'))
    })

    it('rejects a token whose payload is missing id or email', async () => {
      const noEmail = JSON.stringify({ id: 7, iat: NOW_SECONDS })

      await expect(service.verify(noEmail)).rejects.toThrow(
        new UnauthorizedError('Invalid token payload')
      )
    })

    it('rejects a token older than the access-token maximum age', async () => {
      const token = provider
        .issueAt(NOW_SECONDS - ACCESS_MAX_AGE_SECONDS - 60)
        .sign({ id: 7, email: 'ada@example.com' })

      // A fixed clock makes this a plain assertion. The equivalent test
      // against the old middleware would have to manipulate timers or wait.
      await expect(service.verify(token)).rejects.toThrow(
        new UnauthorizedError('Token expired, please login again')
      )
    })

    it('accepts a token issued exactly at the age limit', async () => {
      const token = provider
        .issueAt(NOW_SECONDS - ACCESS_MAX_AGE_SECONDS)
        .sign({ id: 7, email: 'ada@example.com' })

      await expect(service.verify(token)).resolves.toBeDefined()
    })

    it('skips the age check for a token with no iat claim', async () => {
      const token = provider.sign({ id: 7, email: 'ada@example.com' })

      await expect(service.verify(token)).resolves.toBeDefined()
    })
  })

  describe('revoke', () => {
    it('records the token under its provider-supplied hash, not the token itself', async () => {
      const token = provider.sign({ id: 7, email: 'ada@example.com' })

      await service.revoke(token)

      expect(await blacklist.isBlacklisted(provider.hashForRevocation(token))).toBe(true)
      expect(await blacklist.isBlacklisted(token)).toBe(false)
    })

    it('keeps the revocation only until the token would expire anyway', async () => {
      const exp = NOW_SECONDS + 3600
      const token = provider.expireAt(exp).sign({ id: 7, email: 'ada@example.com' })

      await service.revoke(token)

      // Still revoked now...
      expect(await blacklist.isBlacklisted(provider.hashForRevocation(token))).toBe(true)
      // ...and the stored expiry is the token's own, so cleanup can drop it
      // once verification would reject it as expired regardless.
      const expired = new InMemoryTokenBlacklistRepository(() => new Date((exp + 1) * 1000))
      const expiringService = new TokenService(provider, expired, new FixedClock(NOW), logger)
      await expiringService.revoke(token)
      await expired.deleteExpired()
      expect(expired.size).toBe(0)
    })

    it('falls back to the access-token window for a token with no exp claim', async () => {
      const token = provider.sign({ id: 7, email: 'ada@example.com' })

      await service.revoke(token)

      const justBeforeFallback = new InMemoryTokenBlacklistRepository(
        () => new Date(NOW.getTime() + ACCESS_MAX_AGE_SECONDS * 1000 - 1000)
      )
      const fallbackService = new TokenService(
        provider,
        justBeforeFallback,
        new FixedClock(NOW),
        logger,
        { maxAgeSeconds: ACCESS_MAX_AGE_SECONDS }
      )
      await fallbackService.revoke(token)
      await justBeforeFallback.deleteExpired()
      expect(justBeforeFallback.size).toBe(1)
    })

    it('is idempotent', async () => {
      const token = provider.sign({ id: 7, email: 'ada@example.com' })

      await service.revoke(token)
      await service.revoke(token)

      expect(blacklist.size).toBe(1)
    })

    it('logs only a truncated hash, never the token', async () => {
      const token = provider.sign({ id: 7, email: 'ada@example.com' })

      await service.revoke(token)

      const line = logger.lines.find(l => l.message === 'Token blacklisted')
      expect(line).toBeDefined()
      expect(JSON.stringify(line?.meta)).not.toContain('ada@example.com')
      expect(String(line?.meta?.tokenHash)).toHaveLength(10)
    })

    it('still succeeds when the opportunistic cleanup fails', async () => {
      const token = provider.sign({ id: 7, email: 'ada@example.com' })
      const failingCleanup = {
        add: async () => {},
        isBlacklisted: async () => false,
        deleteExpired: async () => {
          throw new Error('connection reset')
        },
      }
      const resilient = new TokenService(provider, failingCleanup, new FixedClock(NOW), logger)

      // Logging out must not fail because housekeeping did.
      await expect(resilient.revoke(token)).resolves.toBeUndefined()
    })
  })
})
