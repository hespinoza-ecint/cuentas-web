import { api } from '../../lib/api/client.ts'
import { problemFrom } from '../../lib/problem.ts'

export interface CreditCard {
  id: string
  userId: string
  alias: string
  institution: string
  last4: string
  currency: string
  status: string
  creditLimit: number
  currentBalance: number
  availableCredit: number
  balanceVersion: number
  annualRateBps: number
  annualFee: number | null
  annualFeeMonth: number | null
  cutDay: number
  dueDateMode: string
  dueDay: number | null
  dueDaysAfterCut: number | null
  dueNonBusinessDayRule: string
  sameDayCutIncluded: boolean
  createdAt: string
  updatedAt: string
}

export interface CardLedgerEntry {
  id: string
  userId: string
  creditCardId: string
  statementId: string | null
  reversesEntryId: string | null
  type: string
  amount: number
  occurredOn: string
  description: string
  sourceType: string | null
  sourceId: string | null
  createdById: string
  createdAt: string
}

export interface CardStatement {
  id: string
  userId: string
  creditCardId: string
  periodStart: string
  cutDate: string
  dueDate: string
  statementBalance: number
  cycleCharges: number
  noInterestPaymentCalc: number
  noInterestPaymentReported: number | null
  minimumPaymentReported: number | null
  minimumPaymentEstimated: number
  paidAmount: number
  status: string
  estimatedInterest?: number
  estimatedInterestDays?: number
  createdAt: string
  updatedAt: string
}

export interface StatementAllocation {
  targetType: string
  amount: number
  installmentId: string | null
  cardPayment: { id: string; paymentDate: string; amount: number } | null
}

export interface StatementDetail extends CardStatement {
  allocations: StatementAllocation[]
}

export interface CurrentCycle {
  cardId: string
  today: string
  lastCutDate: string
  nextCutDate: string
  currentPeriodStart: string
  cycleChargesToDate: number
  currentBalance: number
  availableCredit: number
  projectedDueDate: string
}

export interface CreateCardInput {
  alias: string
  institution: string
  last4: string
  creditLimit: number
  annualRateBps?: number
  annualFee?: number
  annualFeeMonth?: number
  cutDay: number
  dueDateMode?: 'FIXED_DAY' | 'DAYS_AFTER_CUT'
  dueDay?: number
  dueDaysAfterCut?: number
  dueNonBusinessDayRule?: 'PREVIOUS' | 'NEXT' | 'NONE'
  sameDayCutIncluded?: boolean
  openingBalance?: number
  openingDate?: string
}

export type UpdateCardInput = Partial<Omit<CreateCardInput, 'openingBalance' | 'openingDate'>> & {
  status?: 'ACTIVE' | 'INACTIVE'
}

export async function listCards(): Promise<CreditCard[]> {
  const { data, error, response } = await api.GET('/api/v1/cards')
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as CreditCard[]
}

export async function getCard(id: string): Promise<CreditCard> {
  const { data, error, response } = await api.GET('/api/v1/cards/{id}', {
    params: { path: { id } },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as CreditCard
}

export async function createCard(input: CreateCardInput): Promise<CreditCard> {
  const { data, error, response } = await api.POST('/api/v1/cards', { body: input })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as CreditCard
}

export async function updateCard(id: string, input: UpdateCardInput): Promise<CreditCard> {
  const { data, error, response } = await api.PATCH('/api/v1/cards/{id}', {
    params: { path: { id } },
    body: input,
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as CreditCard
}

export interface CardPurgeCounts {
  purchases: number
  installmentPlans: number
  installments: number
  cardPayments: number
  paymentAllocations: number
  cardLedgerEntries: number
  cardStatements: number
  recurringExpenses: number
}

export interface CardPurgeResult {
  message: string
  deleted: CardPurgeCounts
}

/** Reinicia la tarjeta: borra su historial y la deja con saldo $0 (RN-28). */
export async function resetCard(id: string, reason: string): Promise<CardPurgeResult> {
  const { data, error, response } = await api.POST('/api/v1/cards/{id}/reset', {
    params: { path: { id } },
    body: { reason },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as CardPurgeResult
}

/** Elimina la tarjeta y todo su historial (RN-28). */
export async function deleteCard(id: string, reason: string): Promise<CardPurgeResult> {
  const { data, error, response } = await api.DELETE('/api/v1/cards/{id}', {
    params: { path: { id } },
    body: { reason },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as CardPurgeResult
}

export async function reconcileCard(
  id: string,
  input: { reportedBalance: number; asOfDate: string; reason: string },
) {
  const { data, error, response } = await api.POST('/api/v1/cards/{id}/reconcile', {
    params: { path: { id } },
    body: input,
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as { card: CreditCard; difference: number; adjusted: boolean; entryId: string }
}

export async function listLedger(
  cardId: string,
  params: { type?: string; from?: string; to?: string; limit?: number; cursor?: string },
) {
  const { data, error, response } = await api.GET('/api/v1/cards/{id}/ledger', {
    params: {
      path: { id: cardId },
      query: {
        type: params.type as 'PURCHASE' | undefined,
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
    data: CardLedgerEntry[]
    meta: { limit: number; nextCursor: string | null; hasMore: boolean }
  }
}

export async function listStatements(cardId: string): Promise<CardStatement[]> {
  const { data, error, response } = await api.GET('/api/v1/cards/{id}/statements', {
    params: { path: { id: cardId } },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as CardStatement[]
}

export async function getCurrentCycle(cardId: string): Promise<CurrentCycle> {
  const { data, error, response } = await api.GET('/api/v1/cards/{id}/statements/current', {
    params: { path: { id: cardId } },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as CurrentCycle
}

export async function getStatement(cardId: string, statementId: string): Promise<StatementDetail> {
  const { data, error, response } = await api.GET(
    '/api/v1/cards/{id}/statements/{statementId}',
    { params: { path: { id: cardId, statementId } } },
  )
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as StatementDetail
}

export async function updateStatement(
  cardId: string,
  statementId: string,
  input: { noInterestPaymentReported?: number | null; minimumPaymentReported?: number | null },
): Promise<CardStatement> {
  const { data, error, response } = await api.PATCH(
    '/api/v1/cards/{id}/statements/{statementId}',
    {
      params: { path: { id: cardId, statementId } },
      body: {
        noInterestPaymentReported: input.noInterestPaymentReported ?? undefined,
        minimumPaymentReported: input.minimumPaymentReported ?? undefined,
      },
    },
  )
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as CardStatement
}
