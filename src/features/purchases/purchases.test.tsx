import { fireEvent, screen, waitFor, within } from '@testing-library/react'
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

const plan = {
  id: 'plan-1',
  creditCardId: 'card-1',
  purchaseId: 'pur-1',
  type: 'MSI',
  principal: 100000,
  months: 3,
  annualRateBps: 0,
  ivaRateBps: 1600,
  commissionAmount: 0,
  commissionMode: 'NONE',
  amortizationMethod: 'FRENCH',
  firstStatementDate: '2026-10-15',
  estimatedMonthlyPayment: 33333,
  totalInterest: 0,
  totalIva: 0,
  outstandingPrincipal: 100000,
  prepaymentMode: 'REDUCE_TERM',
  status: 'ACTIVE',
  version: 1,
  installments: [
    {
      id: 'ins-1',
      planId: 'plan-1',
      number: 1,
      statementCutDate: '2026-10-15',
      dueDate: '2026-11-04',
      principal: 33333,
      interest: 0,
      iva: 0,
      fee: 0,
      totalAmount: 33333,
      paidAmount: 0,
      status: 'SCHEDULED',
      paidAt: null,
    },
  ],
}

const purchase = {
  id: 'pur-1',
  userId: 'user-1',
  creditCardId: 'card-1',
  categoryId: null,
  recurringExpenseId: null,
  recommendationId: null,
  description: 'Telefono',
  amount: 100000,
  purchaseDate: '2026-10-02',
  occurrenceDate: null,
  type: 'MSI',
  status: 'ACTIVE',
  notes: null,
  createdAt: '2026-10-02T00:00:00.000Z',
  updatedAt: '2026-10-02T00:00:00.000Z',
  category: null,
  creditCard: { id: 'card-1', alias: 'Oro', last4: '4321' },
  installmentPlan: plan,
}

const paidPlan = {
  ...plan,
  outstandingPrincipal: 60000,
  installments: [
    { ...plan.installments[0], paidAmount: 33333, status: 'PAID', paidAt: '2026-11-04T12:00:00.000Z' },
    {
      ...plan.installments[0],
      id: 'ins-2',
      number: 2,
      statementCutDate: '2026-11-15',
      dueDate: '2026-12-04',
    },
    {
      ...plan.installments[0],
      id: 'ins-3',
      number: 3,
      statementCutDate: '2026-12-15',
      dueDate: '2027-01-04',
    },
  ],
}

const paidPurchase = {
  ...purchase,
  id: 'pur-2',
  description: 'Laptop a meses',
  installmentPlan: paidPlan,
}

function baseHandlers() {
  return [
    refreshOk,
    settingsHandler,
    http.get(`${API_BASE}/api/v1/cards`, () => HttpResponse.json([card])),
    http.get(`${API_BASE}/api/v1/categories`, () => HttpResponse.json([])),
    http.get(`${API_BASE}/api/v1/purchases`, () =>
      HttpResponse.json({ data: [purchase], meta: { limit: 20, nextCursor: null, hasMore: false } }),
    ),
  ]
}

describe('compras', () => {
  it('lista compras con su próxima mensualidad', async () => {
    server.use(...baseHandlers())
    renderApp(['/compras'])

    const list = await screen.findByTestId('purchases-list')
    expect(within(list).getByText('Telefono')).toBeInTheDocument()
    expect(within(list).getByText('MSI')).toBeInTheDocument()
    expect(within(list).getByText(/próxima #1/)).toBeInTheDocument()
    expect(within(list).getByText('$1,000.00')).toBeInTheDocument()
  })

  it('registra una compra MSI a 3 meses', async () => {
    let created: Record<string, unknown> | null = null

    server.use(
      ...baseHandlers(),
      http.post(`${API_BASE}/api/v1/purchases`, async ({ request }) => {
        created = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(purchase, { status: 201 })
      }),
    )

    renderApp(['/compras'])
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Registrar compra' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Descripción'), 'Laptop')
    await user.type(within(dialog).getByLabelText('Monto'), '12000')
    await user.selectOptions(within(dialog).getByLabelText('Tipo'), 'MSI')
    await user.click(within(dialog).getByRole('button', { name: 'Registrar compra' }))

    await waitFor(() => expect(created).not.toBeNull())
    expect(created?.type).toBe('MSI')
    expect(created?.months).toBe(3)
    expect(created?.amount).toBe(1200000)
    expect(created?.annualRateBps).toBe(0)
    expect(created?.firstStatementMonth).toBeUndefined()
    expect(created?.purchaseDate).toBe(todayInTimeZone(userSettingsFixture.timezone))
  })

  it('registra una compra MSI ya iniciada con mes del primer corte', async () => {
    let created: Record<string, unknown> | null = null

    server.use(
      ...baseHandlers(),
      http.post(`${API_BASE}/api/v1/purchases`, async ({ request }) => {
        created = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(purchase, { status: 201 })
      }),
    )

    renderApp(['/compras'])
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Registrar compra' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Descripción'), 'Telefono viejo')
    await user.type(within(dialog).getByLabelText('Monto'), '6000')
    await user.selectOptions(within(dialog).getByLabelText('Tipo'), 'MSI')
    fireEvent.change(within(dialog).getByLabelText('Mes del primer corte'), {
      target: { value: '2026-05' },
    })
    await user.click(within(dialog).getByRole('button', { name: 'Registrar compra' }))

    await waitFor(() => expect(created).not.toBeNull())
    expect(created?.type).toBe('MSI')
    expect(created?.firstStatementMonth).toBe('2026-05')
  })

  it('cancela una compra con motivo', async () => {
    let cancelled: { id: string; body: Record<string, unknown> } | null = null

    server.use(
      ...baseHandlers(),
      http.post(`${API_BASE}/api/v1/purchases/:id/cancel`, async ({ request, params }) => {
        cancelled = { id: params.id as string, body: (await request.json()) as Record<string, unknown> }
        return HttpResponse.json({ ...purchase, status: 'CANCELLED' }, { status: 201 })
      }),
    )

    renderApp(['/compras'])
    const user = userEvent.setup()

    const list = await screen.findByTestId('purchases-list')
    await user.click(within(list).getByRole('button', { name: 'Cancelar' }))

    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Motivo'), 'Devolucion completa')
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar compra' }))

    await waitFor(() => expect(cancelled).not.toBeNull())
    expect(cancelled?.id).toBe('pur-1')
    expect(cancelled?.body.reason).toBe('Devolucion completa')
    expect(await screen.findByText(/Compra cancelada/)).toBeInTheDocument()
  })

  it('elimina una compra con mensualidades pagadas y avisa el ajuste', async () => {
    let deleted: { id: string; body: Record<string, unknown> } | null = null

    server.use(...baseHandlers())
    server.use(
      http.get(`${API_BASE}/api/v1/purchases`, () =>
        HttpResponse.json({
          data: [paidPurchase],
          meta: { limit: 20, nextCursor: null, hasMore: false },
        }),
      ),
      http.delete(`${API_BASE}/api/v1/purchases/:id`, async ({ request, params }) => {
        deleted = { id: params.id as string, body: (await request.json()) as Record<string, unknown> }
        return HttpResponse.json({ deleted: true, refundedPrincipal: 60000, paidAmount: 33333 })
      }),
    )

    renderApp(['/compras'])
    const user = userEvent.setup()

    const list = await screen.findByTestId('purchases-list')
    await user.click(within(list).getByRole('button', { name: 'Eliminar' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/Se descontarán \$600\.00/)).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText('Motivo'), 'Registrada por error')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar compra' }))

    await waitFor(() => expect(deleted).not.toBeNull())
    expect(deleted?.id).toBe('pur-2')
    expect(deleted?.body.reason).toBe('Registrada por error')
    expect(await screen.findByText(/se descontaron \$600\.00/)).toBeInTheDocument()
  })

  it('no ofrece eliminar una compra sin pagos (solo cancelar)', async () => {
    server.use(...baseHandlers())
    renderApp(['/compras'])

    const list = await screen.findByTestId('purchases-list')
    expect(within(list).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(within(list).queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
  })
})
