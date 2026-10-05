import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { todayInTimeZone } from '../../lib/dates.ts'
import { API_BASE, refreshOk, settingsHandler, userSettingsFixture } from '../../test/fixtures.ts'
import { server } from '../../test/msw/server.ts'
import { renderApp } from '../../test/render-app.tsx'

const card = {
  id: 'card-1',
  userId: 'user-1',
  alias: 'Oro',
  institution: 'Banco A',
  last4: '4321',
  currency: 'MXN',
  status: 'ACTIVE',
  creditLimit: 1000000,
  currentBalance: 200000,
  availableCredit: 800000,
  balanceVersion: 1,
  annualRateBps: 3600,
  annualFee: null,
  annualFeeMonth: null,
  cutDay: 15,
  dueDateMode: 'DAYS_AFTER_CUT',
  dueDay: null,
  dueDaysAfterCut: 20,
  dueNonBusinessDayRule: 'PREVIOUS',
  sameDayCutIncluded: true,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

const account = {
  id: 'acc-1',
  userId: 'user-1',
  name: 'Débito BBVA',
  type: 'DEBIT',
  isSpendable: true,
  isDefault: true,
  currency: 'MXN',
  currentBalance: 500000,
  balanceVersion: 1,
  status: 'ACTIVE',
  lastReconciledAt: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

const payment = {
  id: 'pay-1',
  userId: 'user-1',
  creditCardId: 'card-1',
  cashAccountId: 'acc-1',
  statementId: 'st-1',
  installmentPlanId: null,
  cashMovementId: 'mov-1',
  cardLedgerEntryId: 'le-2',
  amount: 50000,
  paymentDate: '2026-10-05',
  type: 'STATEMENT',
  status: 'APPLIED',
  notes: null,
  createdAt: '2026-10-05T00:00:00.000Z',
  updatedAt: '2026-10-05T00:00:00.000Z',
}

function baseHandlers() {
  return [
    refreshOk,
    settingsHandler,
    http.get(`${API_BASE}/api/v1/cards`, () => HttpResponse.json([card])),
    http.get(`${API_BASE}/api/v1/cash-accounts`, () => HttpResponse.json([account])),
    http.get(`${API_BASE}/api/v1/card-payments`, () =>
      HttpResponse.json({ data: [payment], meta: { limit: 20, nextCursor: null, hasMore: false } }),
    ),
  ]
}

describe('pagos de tarjeta', () => {
  it('lista los pagos con tarjeta y tipo', async () => {
    server.use(...baseHandlers())
    renderApp(['/pagos'])

    const list = await screen.findByTestId('payments-list')
    expect(within(list).getByText(/Oro ····4321/)).toBeInTheDocument()
    expect(within(list).getByText('Pago de corte')).toBeInTheDocument()
    expect(within(list).getByText('$500.00')).toBeInTheDocument()
  })

  it('registra un pago y muestra su aplicación', async () => {
    let created: Record<string, unknown> | null = null

    server.use(
      ...baseHandlers(),
      http.post(`${API_BASE}/api/v1/card-payments`, async ({ request }) => {
        created = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          {
            payment,
            allocations: [{ id: 'a-1', targetType: 'STATEMENT', amount: 50000 }],
          },
          { status: 201 },
        )
      }),
    )

    renderApp(['/pagos'])
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Registrar pago' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Monto'), '500')
    await user.click(within(dialog).getByRole('button', { name: 'Registrar pago' }))

    await waitFor(() => expect(created).not.toBeNull())
    expect(created?.creditCardId).toBe('card-1')
    expect(created?.cashAccountId).toBe('acc-1')
    expect(created?.amount).toBe(50000)
    expect(created?.paymentDate).toBe(todayInTimeZone(userSettingsFixture.timezone))
    expect(await screen.findByText('Pago aplicado a: Corte.')).toBeInTheDocument()
  })

  it('revierte un pago con motivo', async () => {
    let reversed: { id: string; body: Record<string, unknown> } | null = null

    server.use(
      ...baseHandlers(),
      http.post(`${API_BASE}/api/v1/card-payments/:id/reverse`, async ({ request, params }) => {
        reversed = { id: params.id as string, body: (await request.json()) as Record<string, unknown> }
        return HttpResponse.json({ ...payment, status: 'REVERSED' }, { status: 201 })
      }),
    )

    renderApp(['/pagos'])
    const user = userEvent.setup()

    const list = await screen.findByTestId('payments-list')
    await user.click(within(list).getByRole('button', { name: 'Revertir' }))

    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Motivo'), 'Pago duplicado')
    await user.click(within(dialog).getByRole('button', { name: 'Revertir' }))

    await waitFor(() => expect(reversed).not.toBeNull())
    expect(reversed?.id).toBe('pay-1')
    expect(reversed?.body.reason).toBe('Pago duplicado')
  })
})
