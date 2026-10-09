import { api } from '../../lib/api/client.ts'
import { problemFrom } from '../../lib/problem.ts'

/**
 * Respuestas de la API que aún no tienen esquema en OpenAPI (los controllers
 * devuelven objetos compuestos). Se documentan aquí con los tipos reales.
 */
export interface DashboardCardItem {
  id: string
  alias: string
  last4: string
  creditLimit: number
  currentBalance: number
  availableCredit: number
  utilizationBps: number
  nextCutDate: string
  nextDueDate: string
  pendingPayment: number
}

export interface DashboardSummary {
  today: string
  timezone: string
  month: string
  cash: {
    spendableBalance: number
    totalBalance: number
    accountCount: number
  }
  cards: {
    totalDebt: number
    totalAvailableCredit: number
    items: DashboardCardItem[]
  }
  upcomingIncome: {
    horizonDays: number
    total: number
    items: {
      incomeSourceId: string
      incomeScheduleId: string
      name: string
      date: string
      amount: number
      overdue: boolean
    }[]
  }
  upcomingPayments: {
    horizonDays: number
    total: number
    items: {
      type: 'RECURRING_EXPENSE' | 'CARD_STATEMENT' | 'INSTALLMENT' | 'ANNUAL_FEE'
      description: string
      date: string
      amount: number
      cardAlias?: string
    }[]
  }
  expenses: {
    month: string
    spent: number
    previousMonth: string
    previousSpent: number
    topCategories: {
      categoryId: string | null
      name: string | null
      amount: number
    }[]
  }
  lastRecommendation: {
    id: string
    outcome: string
    score: number | null
    cardAlias: string | null
    last4: string | null
    createdAt: string
  } | null
}

export interface CashflowProjection {
  today: string
  from: string
  to: string
  timezone: string
  /** Días de la ventana (`from` → `to`). */
  horizonDays: number
  /** Saldo al inicio de la ventana (incluye lo ocurrido antes del `from`). */
  startingBalance: number
  minCashBuffer: number
  points: {
    date: string
    inflows: number
    outflows: number
    balance: number
    events: { type: string; description: string; amount: number }[]
  }[]
  minimum: { date: string; balance: number }
  finalBalance: number
  belowBuffer: boolean
}

export async function fetchDashboardSummary(month?: string): Promise<DashboardSummary> {
  const { data, error, response } = await api.GET('/api/v1/dashboard/summary', {
    params: { query: month ? { month } : {} },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as DashboardSummary
}

export async function fetchCashflowProjection(range: {
  from: string
  to: string
}): Promise<CashflowProjection> {
  const { data, error, response } = await api.GET('/api/v1/cashflow/projection', {
    params: { query: { from: range.from, to: range.to } },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as CashflowProjection
}
