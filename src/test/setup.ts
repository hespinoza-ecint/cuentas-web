import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { resetSessionState } from '../lib/auth/session.ts'
import { server } from './msw/server.ts'

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  resetSessionState()
})

afterAll(() => {
  server.close()
})
