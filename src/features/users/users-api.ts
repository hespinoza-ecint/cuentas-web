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

export interface ExportResult {
  data: unknown
  filename: string
}

export async function exportAccountData(): Promise<ExportResult> {
  const { data, error, response } = await api.GET('/api/v1/users/me/export')
  if (error || !data) {
    throw problemFrom(error, response)
  }
  const disposition = response.headers.get('content-disposition') ?? ''
  const match = /filename="?([^";]+)"?/.exec(disposition)
  return {
    data,
    filename: match?.[1] ?? `cuentas-export-${new Date().toISOString().slice(0, 10)}.json`,
  }
}

export async function deleteAccount(password: string): Promise<string> {
  const { data, error, response } = await api.POST('/api/v1/users/me/delete', { body: { password } })
  if (error) {
    throw problemFrom(error, response)
  }
  const message = (data as { message?: string } | undefined)?.message
  return message ?? 'La cuenta se eliminará en 30 días.'
}

export async function cancelDeletion(): Promise<string> {
  const { data, error, response } = await api.POST('/api/v1/users/me/cancel-deletion')
  if (error) {
    throw problemFrom(error, response)
  }
  const message = (data as { message?: string } | undefined)?.message
  return message ?? 'La eliminación fue cancelada.'
}

export interface ResetDataResult {
  message: string
  deleted: Record<string, number>
}

export async function resetAccountData(password: string): Promise<ResetDataResult> {
  const { data, error, response } = await api.POST('/api/v1/users/me/reset', { body: { password } })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as ResetDataResult
}
