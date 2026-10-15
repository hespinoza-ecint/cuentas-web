import { api } from '../../lib/api/client.ts'
import { newIdempotencyKey } from '../../lib/idempotency.ts'
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
  /** RN-30: la API avisa que la compra no se puede cancelar ni eliminar. */
  lockedReason?: PurchaseLockedReason | null
}

export type PurchaseLockedReason = 'STATEMENT_PAID' | 'PLAN_HAS_PAYMENTS'

/** Aviso de una compra bloqueada: su corte o su plan ya tienen pagos. */
export function purchaseLockedNote(
  reason: PurchaseLockedReason | null | undefined,
): string | null {
  if (reason === 'STATEMENT_PAID') {
    return 'El corte de esta compra ya tiene pagos. Revierte el pago para cancelarla o eliminarla.'
  }
  if (reason === 'PLAN_HAS_PAYMENTS') {
    return 'La compra tiene pagos aplicados. Revierte el pago para cancelarla o eliminarla.'
  }
  return null
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

export async function createPurchase(
  input: CreatePurchaseInput,
  idempotencyKey: string = newIdempotencyKey(),
): Promise<Purchase> {
  const { data, error, response } = await api.POST('/api/v1/purchases', {
    headers: { 'Idempotency-Key': idempotencyKey },
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

export interface DeletePurchaseResult {
  deleted: boolean
  /** Cargo pendiente revertido en el saldo de la tarjeta (centavos). */
  refundedPrincipal: number
  /** Pagos y anticipos ya aplicados a las mensualidades desde la app. */
  paidAmount: number
}

/** Elimina una compra solo si su corte no tiene pagos (RN-27 y RN-30). */
export async function deletePurchase(id: string, reason: string): Promise<DeletePurchaseResult> {
  const { data, error, response } = await api.DELETE('/api/v1/purchases/{id}', {
    params: { path: { id } },
    body: { reason },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as DeletePurchaseResult
}

export async function prepayPlan(
  planId: string,
  input: { cashAccountId: string; amount: number; paymentDate: string; notes?: string },
  idempotencyKey: string = newIdempotencyKey(),
) {
  const { data, error, response } = await api.POST('/api/v1/installment-plans/{id}/prepay', {
    params: { path: { id: planId } },
    headers: { 'Idempotency-Key': idempotencyKey },
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

export interface ImportPurchaseRowInput {
  purchaseDate: string
  description: string
  amount: number
}

/** RN-31: avisos de una fila antes de importar. */
export interface ImportPreviewRow {
  index: number
  duplicateOfId: string | null
  statementPaid: boolean
  dateIssue: 'FUTURE_DATE_NOT_ALLOWED' | 'BACKDATE_LIMIT_EXCEEDED' | null
}

export interface ImportPurchasesResult {
  createdCount: number
  purchaseIds: string[]
}

/** RN-31: vista previa de la importacion; no crea nada. */
export async function previewPurchaseImport(input: {
  creditCardId: string
  rows: ImportPurchaseRowInput[]
}): Promise<ImportPreviewRow[]> {
  const { data, error, response } = await api.POST('/api/v1/purchases/import/preview', {
    body: input,
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return (data as { data: ImportPreviewRow[] }).data
}

/** RN-31: importa las filas marcadas en una sola transaccion. */
export async function importPurchases(
  input: { creditCardId: string; rows: ImportPurchaseRowInput[] },
  idempotencyKey: string = newIdempotencyKey(),
): Promise<ImportPurchasesResult> {
  const { data, error, response } = await api.POST('/api/v1/purchases/import', {
    headers: { 'Idempotency-Key': idempotencyKey },
    body: input,
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data as ImportPurchasesResult
}
