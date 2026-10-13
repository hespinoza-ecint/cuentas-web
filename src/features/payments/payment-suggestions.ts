import type { CardStatement, CreditCard } from '../cards/cards-api.ts'

export interface PaymentSuggestion {
  key: 'statement' | 'minimum' | 'balance'
  label: string
  amount: number
}

export interface PaymentSuggestions {
  /** Corte pendiente mas reciente (null si no hay nada por pagar de cortes). */
  pending: CardStatement | null
  options: PaymentSuggestion[]
}

/**
 * Montos que se pueden elegir con un toque al registrar un pago.
 *
 * Misma regla que el dashboard: el corte mas reciente ya incluye el saldo
 * anterior sin cubrir, asi que solo ese cuenta como pendiente. El minimo se
 * muestra sin lo ya pagado y se omite si repite el total del corte.
 */
export function paymentSuggestions(
  statements: CardStatement[],
  card: Pick<CreditCard, 'currentBalance'>,
): PaymentSuggestions {
  const latest = statements
    .filter((statement) => statement.status !== 'PAID')
    .reduce<CardStatement | null>(
      (candidate, statement) =>
        candidate === null || statement.cutDate > candidate.cutDate ? statement : candidate,
      null,
    )

  const effective = latest
    ? (latest.noInterestPaymentReported ?? latest.noInterestPaymentCalc)
    : 0
  const statementDue = Math.max(effective - (latest?.paidAmount ?? 0), 0)
  const pending = latest && statementDue > 0 ? latest : null

  const options: PaymentSuggestion[] = []
  if (pending) {
    const minimum = Math.max(
      (pending.minimumPaymentReported ?? pending.minimumPaymentEstimated) - pending.paidAmount,
      0,
    )
    options.push({ key: 'statement', label: 'Total del corte', amount: statementDue })
    if (minimum > 0 && minimum !== statementDue) {
      options.push({ key: 'minimum', label: 'Pago mínimo', amount: minimum })
    }
  }
  if (card.currentBalance > 0) {
    options.push({ key: 'balance', label: 'Saldo total', amount: card.currentBalance })
  }

  return { pending, options }
}
