import { api } from '../../lib/api/client.ts'
import { problemFrom } from '../../lib/problem.ts'

export interface RecommendationFinding {
  code: string
  message: string
  params?: Record<string, unknown>
}

export interface RecommendationOption {
  kind: 'CARD' | 'CASH'
  cardId?: string
  cardAlias?: string
  eligible: boolean
  eliminatedBy: RecommendationFinding[]
  score: number
  level: string
  reasons: RecommendationFinding[]
  warnings: RecommendationFinding[]
  cutDate?: string
  dueDate?: string
  financingDays: number
  minimumProjectedBalance: number
  minimumProjectedDate: string
  interestCost: number
  utilizationBpsAfter?: number
  paymentPlan: { date: string; amount: number }[]
}

export interface RecommendationResult {
  historyId?: string
  outcome: 'CARD' | 'CASH' | 'NONE'
  recommended?: RecommendationOption
  alternatives: RecommendationOption[]
  suggestions: RecommendationFinding[]
  comparison: {
    financingDays: number | null
    interestCost: number | null
    utilizationBpsAfter: number | null
  }
  disclaimer: string
  engineVersion: string
  evaluatedAt: string
}

export interface RecommendationRequestInput {
  amount: number
  purchaseDate: string
  type: 'REGULAR' | 'MSI' | 'DEFERRED_INTEREST'
  months?: number
  annualRateBps?: number
  eligibleCardIds?: string[]
}

export interface RecommendationHistoryItem {
  id: string
  outcome: string
  score: number | null
  engineVersion: string
  recommendedCard?: { id: string; alias: string; last4: string } | null
  requestInput: RecommendationRequestInput
  createdAt: string
}

export interface RecommendationDetail extends RecommendationHistoryItem {
  contextSnapshot: Record<string, unknown>
  rulesSnapshot: Record<string, unknown>
  result: RecommendationResult
}

export interface RecommendationRule {
  code: string
  kind: 'ELIMINATORY' | 'SCORING'
  name: string
  description: string
  isEnabled: boolean
  weight: number
  params: Record<string, unknown>
  isOverridden: boolean
}

export async function createRecommendation(input: RecommendationRequestInput): Promise<RecommendationResult> {
  const { data, error, response } = await api.POST('/api/v1/recommendations', { body: input })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as RecommendationResult
}

export async function listRecommendations(params: { limit?: number; cursor?: string }) {
  const { data, error, response } = await api.GET('/api/v1/recommendations', {
    params: { query: { limit: params.limit, cursor: params.cursor } },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as {
    data: RecommendationHistoryItem[]
    meta: { limit: number; nextCursor: string | null; hasMore: boolean }
  }
}

export async function getRecommendation(id: string): Promise<RecommendationDetail> {
  const { data, error, response } = await api.GET('/api/v1/recommendations/{id}', {
    params: { path: { id } },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as RecommendationDetail
}

export async function listRules(): Promise<RecommendationRule[]> {
  const { data, error, response } = await api.GET('/api/v1/recommendation-rules')
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as RecommendationRule[]
}

export async function upsertRuleOverride(
  code: string,
  input: { isEnabled?: boolean; weight?: number; params?: Record<string, unknown> },
): Promise<RecommendationRule[]> {
  const { data, error, response } = await api.PUT('/api/v1/recommendation-rules/{code}/override', {
    params: { path: { code } },
    body: input,
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as RecommendationRule[]
}

export async function removeRuleOverride(code: string): Promise<void> {
  const { error, response } = await api.DELETE('/api/v1/recommendation-rules/{code}/override', {
    params: { path: { code } },
  })
  if (error) {
    throw problemFrom(error, response)
  }
}
