import { api } from '../../lib/api/client.ts'
import { problemFrom } from '../../lib/problem.ts'

export interface CashAccount {
  id: string
  userId: string
  name: string
  type: string
  isSpendable: boolean
  isDefault: boolean
  currency: string
  currentBalance: number
  balanceVersion: number
  status: string
  lastReconciledAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateAccountInput {
  name: string
  type?: string
  isSpendable?: boolean
  isDefault?: boolean
  openingBalance?: number
  openingDate?: string
}

export interface UpdateAccountInput {
  name?: string
  isSpendable?: boolean
  isDefault?: boolean
  status?: 'ACTIVE' | 'INACTIVE'
}

export interface TransferInput {
  fromAccountId: string
  toAccountId: string
  amount: number
  occurredOn: string
  description?: string
}

export interface RecalculationResult {
  accountId: string
  storedBalance: number
  calculatedBalance: number
  matches: boolean
  corrected: boolean
  movementCount: number
}

export async function listAccounts(): Promise<CashAccount[]> {
  const { data, error, response } = await api.GET('/api/v1/cash-accounts')
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as CashAccount[]
}

export async function createAccount(input: CreateAccountInput): Promise<CashAccount> {
  const { data, error, response } = await api.POST('/api/v1/cash-accounts', {
    body: {
      name: input.name,
      type: input.type as 'CASH' | 'DEBIT' | 'SAVINGS' | 'OTHER' | undefined,
      isSpendable: input.isSpendable,
      isDefault: input.isDefault,
      openingBalance: input.openingBalance,
      openingDate: input.openingDate,
    },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as CashAccount
}

export async function updateAccount(id: string, input: UpdateAccountInput): Promise<CashAccount> {
  const { data, error, response } = await api.PATCH('/api/v1/cash-accounts/{id}', {
    params: { path: { id } },
    body: input,
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as CashAccount
}

export async function removeAccount(id: string): Promise<void> {
  const { error, response } = await api.DELETE('/api/v1/cash-accounts/{id}', {
    params: { path: { id } },
  })
  if (error) {
    throw problemFrom(error, response)
  }
}

export async function setOpeningBalance(id: string, amount: number, occurredOn?: string) {
  const { data, error, response } = await api.POST('/api/v1/cash-accounts/{id}/opening-balance', {
    params: { path: { id } },
    body: occurredOn ? { amount, occurredOn } : { amount },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as { account: CashAccount; movementId: string }
}

export async function recalculateAccount(id: string): Promise<RecalculationResult> {
  const { data, error, response } = await api.POST('/api/v1/cash-accounts/{id}/recalculate', {
    params: { path: { id } },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as RecalculationResult
}

export async function transfer(input: TransferInput) {
  const { data, error, response } = await api.POST('/api/v1/cash-accounts/transfer', {
    body: input,
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as { transferId: string; outMovementId: string; inMovementId: string }
}
