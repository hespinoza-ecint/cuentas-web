import { api } from '../../lib/api/client.ts'
import { problemFrom } from '../../lib/problem.ts'
import type { RecommendationRule } from '../recommendations/recommendations-api.ts'

export interface MaintenanceResult {
  ranAt: string
  sessionsDeleted: number
  tokensDeleted: number
  idempotencyDeleted: number
  usersPurged: number
}

export async function adminUpdateRule(
  code: string,
  input: { isEnabled?: boolean; weight?: number; params?: Record<string, unknown> },
): Promise<RecommendationRule> {
  const { data, error, response } = await api.PATCH('/api/v1/admin/recommendation-rules/{code}', {
    params: { path: { code } },
    body: input,
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as RecommendationRule
}

export async function runMaintenance(): Promise<MaintenanceResult> {
  const { data, error, response } = await api.POST('/api/v1/admin/maintenance/run')
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as MaintenanceResult
}
