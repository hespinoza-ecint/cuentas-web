import { beforeEach, describe, expect, it } from 'vitest'
import { testUser } from '../../test/fixtures.ts'
import {
  bootstrapSession,
  configureSessionRefresh,
  consumeSessionEndReason,
  getSession,
  getStatus,
  refreshSession,
  resetSessionState,
} from './session.ts'

describe('sesión en memoria', () => {
  beforeEach(() => {
    resetSessionState()
  })

  it('deduplica la renovación cuando varias peticiones reciben 401 a la vez', async () => {
    let calls = 0
    configureSessionRefresh(async () => {
      calls += 1
      await new Promise((resolve) => setTimeout(resolve, 10))
      return { accessToken: 'tok-1', user: testUser }
    })

    const [first, second] = await Promise.all([refreshSession(), refreshSession()])

    expect(first).toBe(true)
    expect(second).toBe(true)
    expect(calls).toBe(1)
    expect(getSession()?.accessToken).toBe('tok-1')
    expect(getStatus()).toBe('authenticated')
  })

  it('queda anónima cuando la renovación falla', async () => {
    configureSessionRefresh(async () => null)

    expect(await refreshSession()).toBe(false)
    expect(getSession()).toBeNull()
    expect(getStatus()).toBe('anonymous')
  })

  it('un fallo transitorio (red, 5xx) no cierra la sesión activa', async () => {
    configureSessionRefresh(async () => ({ accessToken: 'tok-1', user: testUser }))
    expect(await refreshSession()).toBe(true)

    configureSessionRefresh(async () => {
      throw new Error('sin red')
    })
    expect(await refreshSession()).toBe(false)
    expect(getStatus()).toBe('authenticated')
    expect(getSession()?.accessToken).toBe('tok-1')
  })

  it('al arrancar sin red no marca la sesión como expirada', async () => {
    configureSessionRefresh(async () => {
      throw new Error('sin red')
    })

    await bootstrapSession()

    expect(getStatus()).toBe('anonymous')
    expect(consumeSessionEndReason()).toBeNull()
  })

  it('serializa la renovación entre pestañas cuando navigator.locks existe', async () => {
    const requested: string[] = []
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request: (name: string, callback: () => Promise<unknown>) => {
          requested.push(name)
          return callback()
        },
      },
    })

    try {
      configureSessionRefresh(async () => ({ accessToken: 'tok-lock', user: testUser }))
      expect(await refreshSession()).toBe(true)
      expect(requested).toEqual(['cuentas-session-refresh'])
    } finally {
      Reflect.deleteProperty(navigator, 'locks')
    }
  })
})
