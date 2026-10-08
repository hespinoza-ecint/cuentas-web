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

describe('tarjetas', () => {
  it('lista tarjetas con utilización y disponible', async () => {
    server.use(
      refreshOk,
      settingsHandler,
      http.get(`${API_BASE}/api/v1/cards`, () => HttpResponse.json([card])),
    )

    renderApp(['/tarjetas'])

    const list = await screen.findByTestId('cards-list')
    expect(within(list).getByText(/Oro/)).toBeInTheDocument()
    expect(within(list).getByText(/20\.0%/)).toBeInTheDocument()
    expect(within(list).getByText('$8,000.00')).toBeInTheDocument()
  })

  it('crea una tarjeta con límite en centavos', async () => {
    let created: Record<string, unknown> | null = null

    server.use(
      refreshOk,
      settingsHandler,
      http.get(`${API_BASE}/api/v1/cards`, () => HttpResponse.json([card])),
      http.post(`${API_BASE}/api/v1/cards`, async ({ request }) => {
        created = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...card, id: 'card-2', alias: 'Plata' }, { status: 201 })
      }),
    )

    renderApp(['/tarjetas'])
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Nueva tarjeta' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Alias'), 'Plata')
    await user.type(within(dialog).getByLabelText('Institución'), 'Banco B')
    await user.type(within(dialog).getByLabelText('Últimos 4 dígitos'), '1234')
    await user.type(within(dialog).getByLabelText('Límite de crédito'), '20000')
    await user.click(within(dialog).getByRole('button', { name: 'Crear tarjeta' }))

    await waitFor(() => expect(created).not.toBeNull())
    expect(created?.alias).toBe('Plata')
    expect(created?.institution).toBe('Banco B')
    expect(created?.last4).toBe('1234')
    expect(created?.creditLimit).toBe(2000000)
    expect(created?.dueDaysAfterCut).toBe(20)
    expect(created?.cutDay).toBe(15)
  })

  it('reinicia una tarjeta con motivo y avisa el resultado', async () => {
    let reset: { id: string; body: Record<string, unknown> } | null = null

    server.use(
      refreshOk,
      settingsHandler,
      http.get(`${API_BASE}/api/v1/cards`, () => HttpResponse.json([card])),
      http.post(`${API_BASE}/api/v1/cards/:id/reset`, async ({ request, params }) => {
        reset = { id: params.id as string, body: (await request.json()) as Record<string, unknown> }
        return HttpResponse.json({
          message: 'La tarjeta "Oro" quedo como nueva: saldo $0 y credito completo.',
          deleted: {
            purchases: 1,
            installmentPlans: 1,
            installments: 3,
            cardPayments: 0,
            paymentAllocations: 0,
            cardLedgerEntries: 2,
            cardStatements: 1,
            recurringExpenses: 0,
          },
        })
      }),
    )

    renderApp(['/tarjetas'])
    const user = userEvent.setup()

    const list = await screen.findByTestId('cards-list')
    await user.click(within(list).getByRole('button', { name: 'Reiniciar' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/saldo \$0 y crédito completo/)).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText('Motivo'), 'Tarjeta de pruebas')
    await user.click(within(dialog).getByRole('button', { name: 'Reiniciar tarjeta' }))

    await waitFor(() => expect(reset).not.toBeNull())
    expect(reset?.id).toBe('card-1')
    expect(reset?.body.reason).toBe('Tarjeta de pruebas')
    expect(await screen.findByText(/quedo como nueva/)).toBeInTheDocument()
  })

  it('elimina la tarjeta con todo su historial y motivo', async () => {
    let deleted: { id: string; body: Record<string, unknown> } | null = null

    server.use(
      refreshOk,
      settingsHandler,
      http.get(`${API_BASE}/api/v1/cards`, () => HttpResponse.json([card])),
      http.delete(`${API_BASE}/api/v1/cards/:id`, async ({ request, params }) => {
        deleted = { id: params.id as string, body: (await request.json()) as Record<string, unknown> }
        return HttpResponse.json({
          message: 'La tarjeta "Oro" y todo su historial fueron eliminados.',
          deleted: {
            purchases: 1,
            installmentPlans: 1,
            installments: 3,
            cardPayments: 0,
            paymentAllocations: 0,
            cardLedgerEntries: 2,
            cardStatements: 1,
            recurringExpenses: 1,
          },
        })
      }),
    )

    renderApp(['/tarjetas'])
    const user = userEvent.setup()

    const list = await screen.findByTestId('cards-list')
    await user.click(within(list).getByRole('button', { name: 'Eliminar' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/TODO su historial/)).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText('Motivo'), 'Ya no la uso')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar tarjeta' }))

    await waitFor(() => expect(deleted).not.toBeNull())
    expect(deleted?.id).toBe('card-1')
    expect(deleted?.body.reason).toBe('Ya no la uso')
    expect(await screen.findByText(/fueron eliminados/)).toBeInTheDocument()
  })
})
