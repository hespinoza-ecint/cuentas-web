import { api } from '../../lib/api/client.ts'
import { problemFrom } from '../../lib/problem.ts'

export interface IncomeSchedule {
  id: string
  userId: string
  incomeSourceId: string
  frequency: string
  config: Record<string, unknown>
  nonBusinessDayRule: string
  useHolidays: boolean
  amountOverride: number | null
  startDate: string
  endDate: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface IncomeSource {
  id: string
  userId: string
  cashAccountId: string
  categoryId: string | null
  name: string
  payer: string | null
  amountType: string
  estimatedAmount: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  cashAccount?: { id: string; name: string } | null
  category?: { id: string; name: string } | null
  schedules: IncomeSchedule[]
}

export interface IncomeTransaction {
  id: string
  userId: string
  incomeSourceId: string
  incomeScheduleId: string | null
  cashMovementId: string | null
  expectedDate: string | null
  expectedAmount: number | null
  actualDate: string | null
  actualAmount: number | null
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  incomeSource?: { id: string; name: string } | null
}

export interface UpcomingIncomeItem {
  incomeSourceId: string
  incomeSourceName: string
  incomeScheduleId: string
  expectedDate: string
  expectedAmount: number
  amountType: string
  overdue: boolean
  daysUntil: number
}

export interface ScheduleInput {
  frequency: string
  config?: Record<string, unknown>
  nonBusinessDayRule?: string
  useHolidays?: boolean
  amountOverride?: number
  startDate: string
  endDate?: string
}

export interface CreateSourceInput {
  name: string
  cashAccountId: string
  categoryId?: string
  payer?: string
  amountType?: 'FIXED' | 'VARIABLE'
  estimatedAmount: number
  schedules: ScheduleInput[]
}

export interface UpdateSourceInput {
  name?: string
  payer?: string
  amountType?: 'FIXED' | 'VARIABLE'
  estimatedAmount?: number
  cashAccountId?: string
  categoryId?: string
  isActive?: boolean
}

export async function listSources(): Promise<IncomeSource[]> {
  const { data, error, response } = await api.GET('/api/v1/income/sources')
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as IncomeSource[]
}

export async function createSource(input: CreateSourceInput): Promise<IncomeSource> {
  const { data, error, response } = await api.POST('/api/v1/income/sources', {
    body: {
      name: input.name,
      cashAccountId: input.cashAccountId,
      categoryId: input.categoryId,
      payer: input.payer,
      amountType: input.amountType,
      estimatedAmount: input.estimatedAmount,
      schedules: input.schedules.map((schedule) => serializeSchedule(schedule)),
    },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as IncomeSource
}

export async function updateSource(id: string, input: UpdateSourceInput): Promise<IncomeSource> {
  const { data, error, response } = await api.PATCH('/api/v1/income/sources/{id}', {
    params: { path: { id } },
    body: input,
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as IncomeSource
}

export async function removeSource(id: string): Promise<void> {
  const { error, response } = await api.DELETE('/api/v1/income/sources/{id}', {
    params: { path: { id } },
  })
  if (error) {
    throw problemFrom(error, response)
  }
}

export async function addSchedule(sourceId: string, schedule: ScheduleInput): Promise<IncomeSchedule> {
  const { data, error, response } = await api.POST('/api/v1/income/sources/{id}/schedules', {
    params: { path: { id: sourceId } },
    body: serializeSchedule(schedule),
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as IncomeSchedule
}

export async function updateSchedule(
  sourceId: string,
  scheduleId: string,
  input: Partial<ScheduleInput> & { isActive?: boolean },
): Promise<IncomeSchedule> {
  const { data, error, response } = await api.PATCH(
    '/api/v1/income/sources/{id}/schedules/{scheduleId}',
    {
      params: { path: { id: sourceId, scheduleId } },
      body: serializeSchedule(input),
    },
  )
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as IncomeSchedule
}

export async function removeSchedule(sourceId: string, scheduleId: string): Promise<void> {
  const { error, response } = await api.DELETE(
    '/api/v1/income/sources/{id}/schedules/{scheduleId}',
    { params: { path: { id: sourceId, scheduleId } } },
  )
  if (error) {
    throw problemFrom(error, response)
  }
}

export async function upcomingIncome(days = 60) {
  const { data, error, response } = await api.GET('/api/v1/income/upcoming', {
    params: { query: { days } },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as {
    today: string
    timezone: string
    graceDays: number
    horizonDays: number
    occurrences: UpcomingIncomeItem[]
  }
}

export async function listTransactions(params: { status?: string; incomeSourceId?: string; limit?: number; cursor?: string }) {
  const { data, error, response } = await api.GET('/api/v1/income/transactions', {
    params: {
      query: {
        status: params.status as 'CONFIRMED' | undefined,
        incomeSourceId: params.incomeSourceId,
        limit: params.limit,
        cursor: params.cursor,
      },
    },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as {
    data: IncomeTransaction[]
    meta: { limit: number; nextCursor: string | null; hasMore: boolean }
  }
}

export async function confirmIncome(input: {
  incomeSourceId: string
  incomeScheduleId: string
  expectedDate: string
  actualAmount?: number
  actualDate?: string
  notes?: string
}) {
  const { data, error, response } = await api.POST('/api/v1/income/transactions/confirm', {
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: input,
  })
  if (error) {
    throw problemFrom(error, response)
  }
  return data as IncomeTransaction
}

export async function skipIncome(input: {
  incomeSourceId: string
  incomeScheduleId: string
  expectedDate: string
  notes?: string
}) {
  const { data, error, response } = await api.POST('/api/v1/income/transactions/skip', {
    body: input,
  })
  if (error) {
    throw problemFrom(error, response)
  }
  return data as IncomeTransaction
}

function serializeSchedule(schedule: Partial<ScheduleInput>) {
  return {
    frequency: schedule.frequency as 'WEEKLY',
    config: schedule.config,
    nonBusinessDayRule: schedule.nonBusinessDayRule as 'PREVIOUS' | undefined,
    useHolidays: schedule.useHolidays,
    amountOverride: schedule.amountOverride,
    startDate: schedule.startDate as string,
    endDate: schedule.endDate,
  }
}
