import { api } from '../../lib/api/client.ts'
import { problemFrom } from '../../lib/problem.ts'

export interface Expense {
  id: string
  userId: string
  cashAccountId: string
  categoryId: string | null
  recurringExpenseId: string | null
  cashMovementId: string
  description: string
  amount: number
  expenseDate: string
  occurrenceDate: string | null
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  category?: { id: string; name: string } | null
}

export interface ExpensePage {
  data: Expense[]
  meta: { limit: number; nextCursor: string | null; hasMore: boolean }
}

export interface ListExpensesParams {
  cashAccountId?: string
  categoryId?: string
  from?: string
  to?: string
  limit?: number
  cursor?: string
}

export interface CreateExpenseInput {
  cashAccountId: string
  categoryId?: string
  description: string
  amount: number
  expenseDate: string
  notes?: string
}

export async function listExpenses(params: ListExpensesParams): Promise<ExpensePage> {
  const { data, error, response } = await api.GET('/api/v1/expenses', {
    params: {
      query: {
        cashAccountId: params.cashAccountId,
        categoryId: params.categoryId,
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
  return data as ExpensePage
}

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  const { data, error, response } = await api.POST('/api/v1/expenses', { body: input })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as Expense
}

export async function reverseExpense(id: string, reason: string) {
  const { data, error, response } = await api.POST('/api/v1/expenses/{id}/reverse', {
    params: { path: { id } },
    body: { reason },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as { expenseId: string; reversalMovementId: string }
}
