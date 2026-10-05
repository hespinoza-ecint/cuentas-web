import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { API_BASE, refreshOk, settingsHandler } from '../../test/fixtures.ts'
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

const statement = {
  id: 'st-1',
  userId: 'user-1',
  creditCardId: 'card-1',
  periodStart: '2026-09-16',
  cutDate: '2026-10-15',
  dueDate: '2026-11-04',
  statementBalance: 200000,
  cycleCharges: 200000,
  noInterestPaymentCalc: 200000,
  noInterestPaymentReported: null,
  minimumPaymentReported: null,
  minimumPaymentEstimated: 2500,
  paidAmount: 0,
  status: 'CLOSED',
  estimatedInterest: 0,
  estimatedInterestDays: 0,
  createdAt: '2026-10-15T00:00:00.000Z',
  updatedAt: '2026-10-15T00:00:00.000Z',
}

const ledgerEntry = {
  id: 'le-1',
  userId: 'user-1',
  creditCardId: 'card-1',
  statementId: null,
  reversesEntryId: null,
  type: 'PURCHASE',
  amount: 200000,
  occurredOn: '2026-10-02',
  description: 'Telefono',
  sourceType: 'Purchase',
  sourceId: 'p-1',
  createdById: 'user-1',
  createdAt: '2026-10-02T00:00:00.000Z',
}

describe('detalle de tarjeta', () => {
  it('muestra el ciclo, los cortes y el libro, y guarda los montos reportados', async () => {
    let patched: Record<string, unknown> | null = null

    server.use(
      refreshOk,
      settingsHandler,
      http.get(`${API_BASE}/api/v1/cards/card-1`, () => HttpResponse.json(card)),
      http.get(`${API_BASE}/api/v1/cards/card-1/statements/current`, () =>
        HttpResponse.json({
          cardId: 'card-1',
          today: '2026-10-05',
          lastCutDate: '2026-09-15',
          nextCutDate: '2026-10-15',
          currentPeriodStart: '2026-09-16',
          cycleChargesToDate: 200000,
          currentBalance: 200000,
          availableCredit: 800000,
          projectedDueDate: '2026-11-04',
        }),
      ),
      http.get(`${API_BASE}/api/v1/cards/card-1/statements`, () => HttpResponse.json([statement])),
      http.get(`${API_BASE}/api/v1/cards/card-1/statements/st-1`, () =>
        HttpResponse.json({ ...statement, allocations: [] }),
      ),
      http.get(`${API_BASE}/api/v1/cards/card-1/ledger`, () =>
        HttpResponse.json({ data: [ledgerEntry], meta: { limit: 20, nextCursor: null, hasMore: false } }),
      ),
      http.patch(`${API_BASE}/api/v1/cards/card-1/statements/st-1`, async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...statement, noInterestPaymentReported: 190000 })
      }),
    )

    renderApp(['/tarjetas/card-1'])
    const user = userEvent.setup()

    expect(await screen.findByText('Ciclo actual')).toBeInTheDocument()
    const statements = await screen.findByTestId('statements-list')
    expect(within(statements).getByText(/Corte 15 oct 2026/)).toBeInTheDocument()

    const ledger = screen.getByTestId('ledger-list')
    expect(within(ledger).getByText('Telefono')).toBeInTheDocument()

    await user.click(within(statements).getByRole('button', { name: /Corte 15 oct 2026/ }))
    const dialog = await screen.findByRole('dialog')

    const noInterest = within(dialog).getByLabelText('Pago para no generar intereses')
    await user.clear(noInterest)
    await user.type(noInterest, '1900')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar montos' }))

    await waitFor(() => expect(patched).not.toBeNull())
    expect(patched?.noInterestPaymentReported).toBe(190000)
  })
})
