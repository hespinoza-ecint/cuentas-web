import { describe, expect, it } from 'vitest'
import type { CardStatement } from '../cards/cards-api.ts'
import { paymentSuggestions } from './payment-suggestions.ts'

function statement(overrides: Partial<CardStatement> = {}): CardStatement {
  return {
    id: 'st-1',
    userId: 'user-1',
    creditCardId: 'card-1',
    periodStart: '2026-09-16',
    cutDate: '2026-10-15',
    dueDate: '2026-11-04',
    statementBalance: 300000,
    cycleCharges: 250000,
    noInterestPaymentCalc: 300000,
    noInterestPaymentReported: null,
    minimumPaymentReported: null,
    minimumPaymentEstimated: 15000,
    paidAmount: 0,
    status: 'CLOSED',
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
    ...overrides,
  }
}

const card = { currentBalance: 320000 }

describe('paymentSuggestions', () => {
  it('usa el monto reportado por el banco y descuenta lo ya pagado', () => {
    const result = paymentSuggestions(
      [statement({ noInterestPaymentReported: 280000, paidAmount: 5000 })],
      card,
    )

    expect(result.options).toEqual([
      { key: 'statement', label: 'Total del corte', amount: 275000 },
      { key: 'minimum', label: 'Pago mínimo', amount: 10000 },
      { key: 'balance', label: 'Saldo total', amount: 320000 },
    ])
    expect(result.pending?.id).toBe('st-1')
    expect(result.pending?.cutDate).toBe('2026-10-15')
    expect(result.pending?.dueDate).toBe('2026-11-04')
  })

  it('cae al monto calculado cuando el banco no lo reporta', () => {
    const result = paymentSuggestions([statement()], card)

    expect(result.options).toEqual([
      { key: 'statement', label: 'Total del corte', amount: 300000 },
      { key: 'minimum', label: 'Pago mínimo', amount: 15000 },
      { key: 'balance', label: 'Saldo total', amount: 320000 },
    ])
  })

  it('prefiere el minimo reportado y le descuenta lo pagado', () => {
    const result = paymentSuggestions(
      [statement({ minimumPaymentReported: 8000, paidAmount: 3000 })],
      card,
    )

    expect(result.options).toEqual([
      { key: 'statement', label: 'Total del corte', amount: 297000 },
      { key: 'minimum', label: 'Pago mínimo', amount: 5000 },
      { key: 'balance', label: 'Saldo total', amount: 320000 },
    ])
  })

  it('toma el corte pendiente mas reciente sin importar el orden de la lista', () => {
    const older = statement({
      id: 'st-viejo',
      cutDate: '2026-09-15',
      dueDate: '2026-10-05',
      noInterestPaymentCalc: 100000,
      minimumPaymentEstimated: 5000,
      status: 'OVERDUE',
    })
    const newer = statement({ id: 'st-nuevo', cutDate: '2026-10-15' })

    const result = paymentSuggestions([older, newer], card)

    expect(result.pending?.id).toBe('st-nuevo')
    expect(result.options[0]).toEqual({
      key: 'statement',
      label: 'Total del corte',
      amount: 300000,
    })
  })

  it('ignora cortes pagados aunque sean mas recientes', () => {
    const paid = statement({ id: 'st-pagado', cutDate: '2026-10-15', status: 'PAID' })
    const pending = statement({
      id: 'st-pendiente',
      cutDate: '2026-09-15',
      noInterestPaymentCalc: 100000,
      minimumPaymentEstimated: 5000,
      status: 'OVERDUE',
    })

    const result = paymentSuggestions([paid, pending], card)

    expect(result.pending?.id).toBe('st-pendiente')
    expect(result.options[0]).toEqual({
      key: 'statement',
      label: 'Total del corte',
      amount: 100000,
    })
  })

  it('solo ofrece el saldo total cuando todos los cortes estan pagados', () => {
    const result = paymentSuggestions([statement({ status: 'PAID' })], card)

    expect(result.pending).toBeNull()
    expect(result.options).toEqual([{ key: 'balance', label: 'Saldo total', amount: 320000 }])
  })

  it('solo ofrece el saldo total cuando aun no hay cortes', () => {
    const result = paymentSuggestions([], card)

    expect(result.pending).toBeNull()
    expect(result.options).toEqual([{ key: 'balance', label: 'Saldo total', amount: 320000 }])
  })

  it('no repite el minimo cuando iguala al total del corte', () => {
    const result = paymentSuggestions(
      [
        statement({
          noInterestPaymentReported: 280000,
          minimumPaymentReported: 280000,
        }),
      ],
      card,
    )

    expect(result.options).toEqual([
      { key: 'statement', label: 'Total del corte', amount: 280000 },
      { key: 'balance', label: 'Saldo total', amount: 320000 },
    ])
  })

  it('oculta montos en cero: un corte ya cubierto no cuenta como pendiente', () => {
    const result = paymentSuggestions([statement({ paidAmount: 300000 })], card)

    expect(result.pending).toBeNull()
    expect(result.options).toEqual([{ key: 'balance', label: 'Saldo total', amount: 320000 }])
  })

  it('sin deuda no hay opciones', () => {
    const result = paymentSuggestions([], { currentBalance: 0 })

    expect(result.pending).toBeNull()
    expect(result.options).toEqual([])
  })
})
