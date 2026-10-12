import { afterEach, describe, expect, it, vi } from 'vitest'
import { API_READ_CACHE_NAME, isCacheableApiRead, purgeApiCache } from './api-cache.ts'

describe('cache de lectura de la API', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('solo cachea lecturas de la API que no son sensibles', () => {
    expect(isCacheableApiRead(new URL('https://app.test/api/v1/cards'), 'GET')).toBe(true)
    expect(isCacheableApiRead(new URL('https://app.test/api/v1/cards'), 'POST')).toBe(false)
    expect(isCacheableApiRead(new URL('https://app.test/api/v1/auth/sessions'), 'GET')).toBe(false)
    expect(isCacheableApiRead(new URL('https://app.test/api/v1/users/me/export'), 'GET')).toBe(
      false,
    )
    expect(isCacheableApiRead(new URL('https://app.test/otra-ruta'), 'GET')).toBe(false)
  })

  it('purga la cache del service worker cuando el navegador la expone', async () => {
    const del = vi.fn().mockResolvedValue(true)
    vi.stubGlobal('caches', { delete: del })

    purgeApiCache()

    expect(del).toHaveBeenCalledWith(API_READ_CACHE_NAME)
  })

  it('no falla cuando el navegador no expone Cache Storage', () => {
    vi.stubGlobal('caches', undefined)

    expect(() => purgeApiCache()).not.toThrow()
  })
})
