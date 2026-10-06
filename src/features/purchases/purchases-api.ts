import { api } from '../../lib/api/client.ts'
import { problemFrom } from '../../lib/problem.ts'

export interface Installment {
  id: string
  planId: string
  number: number
  statementCutDate: string
  dueDate: string
  principal: number
  interest: number
  iva: number
  fee: number
  totalAmount: number
  paidAmount: number
  status: string
  paidAt: string | null
}

export interface InstallmentPlan {
  id: string
  creditCardId: string
  purchaseId: string
  type: string
  principal: number
  months: number
  annualRateBps: number
  ivaRateBps: number
  commissionAmount: number
  commissionMode: string
  amortizationMethod: string
  firstStatementDate: string
  estimatedMonthlyPayment: number
  totalInterest: number
  totalIva: number
  outstandingPrincipal: number
  prepaymentMode: string
  status: string
  version: number
  installments: Installment[]
}

export interface Purchase {
  id: string
  userId: string
  creditCardId: string
  categoryId: string | null
  recurringExpenseId: string | null
  recommendationId: string | null
  description: string
  amount: number
  purchaseDate: string
  occurrenceDate: string | null
  type: string
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  category?: { id: string; name: string } | null
  creditCard?: { id: string; alias: string; last4: string } | null
  installmentPlan?: InstallmentPlan | null
}

export interface CreatePurchaseInput {
  creditCardId: string
  categoryId?: string
  description: string
  amount: number
  purchaseDate: string
  type: 'REGULAR' | 'MSI' | 'DEFERRED_INTEREST'
  months?: number
  annualRateBps?: number
  commissionAmount?: number
  commissionMode?: 'NONE' | 'UPFRONT' | 'PRORATED'
  /** Mes del primer corte ("YYYY-MM") para compras a meses ya iniciadas. */
  firstStatementMonth?: string
  notes?: string
  recommendationId?: string
}

export async function listPurchases(params: {
  creditCardId?: string
  type?: string
  status?: string
  from?: string
  to?: string
  limit?: number
  cursor?: string
}) {
  const { data, error, response } = await api.GET('/api/v1/purchases', {
    params: {
      query: {
        creditCardId: params.creditCardId,
        type: params.type as 'REGULAR' | undefined,
        status: params.status as 'ACTIVE' | undefined,
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
  return data as {
    data: Purchase[]
    meta: { limit: number; nextCursor: string | null; hasMore: boolean }
  }
}

export async function createPurchase(input: CreatePurchaseInput): Promise<Purchase> {
  const { data, error, response } = await api.POST('/api/v1/purchases', {
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: input,
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as Purchase
}

export async function getPurchase(id: string): Promise<Purchase> {
  const { data, error, response } = await api.GET('/api/v1/purchases/{id}', {
    params: { path: { id } },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as Purchase
}

export async function cancelPurchase(id: string, reason: string): Promise<Purchase> {
  const { data, error, response } = await api.POST('/api/v1/purchases/{id}/cancel', {
    params: { path: { id } },
    body: { reason },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as Purchase
}

export async function prepayPlan(
  planId: string,
  input: { cashAccountId: string; amount: number; paymentDate: string; notes?: string },
) {
  const { data, error, response } = await api.POST('/api/v1/installment-plans/{id}/prepay', {
    params: { path: { id: planId } },
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: input,
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as {
    plan: InstallmentPlan
    paymentId: string
    allocations: { installmentId: string; amount: number }[]
    settled: boolean
  }
}
