import '@testing-library/jest-dom/vitest'
import { configure, cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { resetSessionState } from '../lib/auth/session.ts'
import { server } from './msw/server.ts'

// Las consultas async tienen 1 s por defecto; en este entorno conviene más margen.
configure({ asyncUtilTimeout: 10000 })

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
