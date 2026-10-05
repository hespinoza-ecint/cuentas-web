import { api } from '../../lib/api/client.ts'
import { problemFrom } from '../../lib/problem.ts'

export interface PaymentAllocation {
  id: string
  cardPaymentId: string
  statementId: string | null
  targetType: string
  installmentId: string | null
  amount: number
  createdAt: string
}

export interface CardPayment {
  id: string
  userId: string
  creditCardId: string
  cashAccountId: string
  statementId: string | null
  installmentPlanId: string | null
  cashMovementId: string
  cardLedgerEntryId: string
  amount: number
  paymentDate: string
  type: string
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  allocations?: PaymentAllocation[]
}

export async function listPayments(params: { creditCardId?: string; limit?: number; cursor?: string }) {
  const { data, error, response } = await api.GET('/api/v1/card-payments', {
    params: {
      query: {
        creditCardId: params.creditCardId,
        limit: params.limit,
        cursor: params.cursor,
      },
    },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as {
    data: CardPayment[]
    meta: { limit: number; nextCursor: string | null; hasMore: boolean }
  }
}

export async function createPayment(input: {
  creditCardId: string
  cashAccountId: string
  amount: number
  paymentDate: string
  notes?: string
}) {
  const { data, error, response } = await api.POST('/api/v1/card-payments', {
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: input,
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as { payment: CardPayment; allocations: PaymentAllocation[] }
}

export async function getPayment(id: string): Promise<CardPayment> {
  const { data, error, response } = await api.GET('/api/v1/card-payments/{id}', {
    params: { path: { id } },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as CardPayment
}

export async function reversePayment(id: string, reason: string): Promise<CardPayment> {
  const { data, error, response } = await api.POST('/api/v1/card-payments/{id}/reverse', {
    params: { path: { id } },
    body: { reason },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as CardPayment
}
