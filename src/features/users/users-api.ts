import type { components } from '../../lib/api/schema.ts'
import { api } from '../../lib/api/client.ts'
import { problemFrom } from '../../lib/problem.ts'

export type UserSettings = components['schemas']['UserSettingsResponseDto']

export interface UpdateProfileInput {
  firstName?: string
  lastName?: string
}

export interface UpdateSettingsInput {
  timezone?: string
  holidayCalendarCode?: 'MX_LABOR' | 'MX_BANKING'
  minCashBuffer?: number
  maxUtilizationBps?: number
  variableIncomeFactorBps?: number
  pendingIncomeGraceDays?: number
  backdateLimitDays?: number
  projectionMinDays?: number
}

export async function updateProfile(input: UpdateProfileInput) {
  const { data, error, response } = await api.PATCH('/api/v1/users/me', { body: input })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<string> {
  const { data, error, response } = await api.POST('/api/v1/users/me/change-password', {
    body: { currentPassword, newPassword },
  })
  if (error) {
    throw problemFrom(error, response)
  }
  const message = (data as { message?: string } | undefined)?.message
  return message ?? 'Contraseña actualizada.'
}

export async function fetchSettings(): Promise<UserSettings> {
  const { data, error, response } = await api.GET('/api/v1/users/me/settings')
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data
}

export async function updateSettings(input: UpdateSettingsInput): Promise<UserSettings> {
  const { data, error, response } = await api.PATCH('/api/v1/users/me/settings', { body: input })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data
}
