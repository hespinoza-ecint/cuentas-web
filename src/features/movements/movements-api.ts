import { api } from '../../lib/api/client.ts'
import { problemFrom } from '../../lib/problem.ts'

export interface CashMovement {
  id: string
  userId: string
  cashAccountId: string
  reversesMovementId: string | null
  type: string
  amount: number
  occurredOn: string
  description: string
  reason: string | null
  sourceType: string | null
  sourceId: string | null
  createdById: string
  createdAt: string
}

export interface MovementPage {
  data: CashMovement[]
  meta: { limit: number; nextCursor: string | null; hasMore: boolean }
}

export interface ListMovementsParams {
  cashAccountId?: string
  type?: string
  from?: string
  to?: string
  limit?: number
  cursor?: string
}

type MovementType =
  | 'OPENING_BALANCE'
  | 'INCOME'
  | 'EXPENSE'
  | 'CARD_PAYMENT'
  | 'ADJUSTMENT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'REVERSAL'

export interface AdjustmentInput {
  cashAccountId: string
  amount: number
  occurredOn: string
  description: string
  reason: string
}

export async function listMovements(params: ListMovementsParams): Promise<MovementPage> {
  const { data, error, response } = await api.GET('/api/v1/cash-movements', {
    params: {
      query: {
        cashAccountId: params.cashAccountId,
        type: params.type as MovementType | undefined,
        from: params.from,
        to: params.to,
        limit: params.limit,
        cursor: params.cursor,
      },
    },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as MovementPage
}

export async function createAdjustment(input: AdjustmentInput): Promise<CashMovement> {
  const { data, error, response } = await api.POST('/api/v1/cash-movements/adjustments', {
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: input,
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as CashMovement
}

export async function reverseMovement(id: string, reason: string): Promise<CashMovement> {
  const { data, error, response } = await api.POST('/api/v1/cash-movements/{id}/reverse', {
    params: { path: { id } },
    body: { reason },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as CashMovement
}
