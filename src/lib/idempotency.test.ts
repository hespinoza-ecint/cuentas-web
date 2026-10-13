import { afterEach, describe, expect, it, vi } from 'vitest'
import { newIdempotencyKey } from './idempotency.ts'

describe('newIdempotencyKey', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('usa crypto.randomUUID cuando existe', () => {
    vi.stubGlobal('crypto', { randomUUID: () => '11111111-1111-4111-8111-111111111111' })

    expect(newIdempotencyKey()).toBe('11111111-1111-4111-8111-111111111111')
  })

  it('genera una llave valida sin crypto.randomUUID (contexto http://IP)', () => {
    vi.stubGlobal('crypto', {})

    const key = newIdempotencyKey()

    expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('genera llaves distintas entre llamadas', () => {
    vi.stubGlobal('crypto', {})

    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey())
  })
})
