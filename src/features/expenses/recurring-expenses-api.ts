import { api } from '../../lib/api/client.ts'
import { problemFrom } from '../../lib/problem.ts'

export interface RecurringExpense {
  id: string
  userId: string
  cashAccountId: string | null
  creditCardId: string | null
  categoryId: string | null
  name: string
  amount: number
  amountType: string
  paymentMethod: string
  frequency: string
  config: string
  nonBusinessDayRule: string
  useHolidays: boolean
  startDate: string
  endDate: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  category?: { id: string; name: string } | null
  cashAccount?: { id: string; name: string } | null
  creditCard?: { id: string; alias: string; last4: string } | null
}

export interface RecurringOccurrence {
  recurringExpenseId: string
  name: string
  expectedDate: string
  amount: number
  categoryId: string | null
  daysUntil: number
}

export interface CreateRecurringInput {
  name: string
  amount: number
  amountType?: 'FIXED' | 'VARIABLE'
  categoryId?: string
  paymentMethod?: 'CASH_ACCOUNT' | 'CREDIT_CARD'
  cashAccountId?: string
  creditCardId?: string
  schedule: {
    frequency: string
    config?: Record<string, unknown>
    nonBusinessDayRule?: string
    useHolidays?: boolean
    startDate: string
    endDate?: string
  }
}

export interface UpdateRecurringInput {
  name?: string
  amount?: number
  amountType?: 'FIXED' | 'VARIABLE'
  categoryId?: string
  paymentMethod?: 'CASH_ACCOUNT' | 'CREDIT_CARD'
  cashAccountId?: string
  creditCardId?: string
  config?: Record<string, unknown>
  nonBusinessDayRule?: string
  useHolidays?: boolean
  startDate?: string
  endDate?: string
  isActive?: boolean
}

export async function listRecurring(includeInactive = false): Promise<RecurringExpense[]> {
  const { data, error, response } = await api.GET('/api/v1/recurring-expenses', {
    params: { query: includeInactive ? { includeInactive: 'true' } : {} },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as RecurringExpense[]
}

export async function createRecurring(input: CreateRecurringInput): Promise<RecurringExpense> {
  const { data, error, response } = await api.POST('/api/v1/recurring-expenses', {
    body: {
      name: input.name,
      amount: input.amount,
      amountType: input.amountType,
      categoryId: input.categoryId,
      paymentMethod: input.paymentMethod,
      cashAccountId: input.cashAccountId,
      creditCardId: input.creditCardId,
      schedule: {
        frequency: input.schedule.frequency as 'WEEKLY',
        config: input.schedule.config,
        nonBusinessDayRule: input.schedule.nonBusinessDayRule as 'PREVIOUS' | undefined,
        useHolidays: input.schedule.useHolidays,
        startDate: input.schedule.startDate,
        endDate: input.schedule.endDate,
      },
    },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as RecurringExpense
}

export async function updateRecurring(
  id: string,
  input: UpdateRecurringInput,
): Promise<RecurringExpense> {
  const { data, error, response } = await api.PATCH('/api/v1/recurring-expenses/{id}', {
    params: { path: { id } },
    body: {
      ...input,
      nonBusinessDayRule: input.nonBusinessDayRule as 'PREVIOUS' | undefined,
    },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as RecurringExpense
}

export async function removeRecurring(id: string): Promise<void> {
  const { error, response } = await api.DELETE('/api/v1/recurring-expenses/{id}', {
    params: { path: { id } },
  })
  if (error) {
    throw problemFrom(error, response)
  }
}

export async function upcomingRecurring(days = 60) {
  const { data, error, response } = await api.GET('/api/v1/recurring-expenses/upcoming', {
    params: { query: { days } },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as { today: string; timezone: string; horizonDays: number; occurrences: RecurringOccurrence[] }
}

export async function confirmRecurring(
  id: string,
  input: { occurrenceDate: string; actualAmount?: number; actualDate?: string; notes?: string },
) {
  const { data, error, response } = await api.POST('/api/v1/recurring-expenses/{id}/confirm', {
    params: { path: { id } },
    body: input,
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as { expenseId?: string; movementId?: string; purchaseId?: string }
}
