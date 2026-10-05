import { HttpResponse } from 'msw'
import type { AuthUser } from '../lib/auth/session.ts'

export const API_BASE = 'http://cuentas.test'

export const testUser: AuthUser = {
  id: 'user-1',
  email: 'ana@test.local',
  firstName: 'Ana',
  lastName: 'López',
  role: 'USER',
  status: 'ACTIVE',
  emailVerified: true,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

/** Respuesta de error RFC 9457 como la sirve el backend. */
export function problem(
  status: number,
  body: Record<string, unknown>,
): HttpResponse<Record<string, unknown>> {
  return HttpResponse.json(
    { type: 'about:blank', status, ...body },
    { status, headers: { 'content-type': 'application/problem+json' } },
  )
}

export function authResponse(accessToken: string) {
  return { accessToken, tokenType: 'Bearer', expiresInSeconds: 900, user: testUser }
}
