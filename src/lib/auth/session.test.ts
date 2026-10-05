import { beforeEach, describe, expect, it } from 'vitest'
import { testUser } from '../../test/fixtures.ts'
import {
  configureSessionRefresh,
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
})
