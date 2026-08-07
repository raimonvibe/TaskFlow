import { describe, it, expect, beforeEach } from 'vitest'
import { RefreshTokenService } from './RefreshTokenService.js'
import { UnauthorizedError } from '../../domain/errors/UnauthorizedError.js'
import { FixedClock } from '../../test/fakes/FixedClock.js'
import { InMemoryRefreshTokenRepository } from '../../test/fakes/InMemoryRefreshTokenRepository.js'
import { RecordingLogger } from '../../test/fakes/RecordingLogger.js'

const NOW = new Date('2026-06-01T12:00:00.000Z')
const SECRET = 'test-refresh-secret'

describe('RefreshTokenService', () => {
  let store: InMemoryRefreshTokenRepository
  let service: RefreshTokenService

  beforeEach(() => {
    store = new InMemoryRefreshTokenRepository()
    service = new RefreshTokenService(
      store,
      SECRET,
      '7d',
      new FixedClock(NOW),
      new RecordingLogger()
    )
  })

  it('issues an opaque token and stores only its HMAC hash', async () => {
    const issued = await service.issue(7)

    expect(issued.token).toBeTruthy()
    expect(issued.familyId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
    expect(store.size).toBe(1)
    expect(store.getByHash(issued.token)).toBeUndefined()
    expect(store.getByHash(service.hash(issued.token))).toBeDefined()
  })

  it('rotates: consumes the old token and returns a new one in the same family', async () => {
    const first = await service.issue(7)

    const rotated = await service.rotate(first.token)

    expect(rotated.userId).toBe(7)
    expect(rotated.refreshToken).not.toBe(first.token)
    expect(store.getByHash(service.hash(first.token))?.revokedAt).toEqual(NOW)
    expect(store.getByHash(service.hash(rotated.refreshToken))?.familyId).toBe(first.familyId)
  })

  it('reuse of a rotated token invalidates the whole family', async () => {
    const first = await service.issue(7)
    const second = await service.rotate(first.token)

    await expect(service.rotate(first.token)).rejects.toThrow(
      new UnauthorizedError('Invalid refresh token')
    )

    // The honest successor is dead too — reuse means the family is stolen.
    await expect(service.rotate(second.refreshToken)).rejects.toThrow(UnauthorizedError)
  })

  it('rejects an unknown or empty token', async () => {
    await expect(service.rotate('')).rejects.toThrow(new UnauthorizedError('Invalid refresh token'))
    await expect(service.rotate('not-a-real-token')).rejects.toThrow(
      new UnauthorizedError('Invalid refresh token')
    )
  })

  it('revokeAllForUser kills every active family for that user', async () => {
    const a = await service.issue(7)
    const b = await service.issue(7)

    await service.revokeAllForUser(7)

    await expect(service.rotate(a.token)).rejects.toThrow(UnauthorizedError)
    await expect(service.rotate(b.token)).rejects.toThrow(UnauthorizedError)
  })
})
