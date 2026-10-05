import type { components } from '../../lib/api/schema.ts'
import { api } from '../../lib/api/client.ts'
import { problemFrom } from '../../lib/problem.ts'

export type UserSession = components['schemas']['SessionResponseDto']

export async function listSessions(): Promise<UserSession[]> {
  const { data, error, response } = await api.GET('/api/v1/auth/sessions')
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data
}

export async function revokeSession(sessionId: string): Promise<void> {
  const { error, response } = await api.DELETE('/api/v1/auth/sessions/{id}', {
    params: { path: { id: sessionId } },
  })
  if (error) {
    throw problemFrom(error, response)
  }
}

export async function logoutAll(): Promise<void> {
  const { error, response } = await api.POST('/api/v1/auth/logout-all')
  if (error) {
    throw problemFrom(error, response)
  }
}
