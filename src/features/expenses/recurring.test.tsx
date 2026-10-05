import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { API_BASE, refreshOk, settingsHandler, userSettingsFixture } from '../../test/fixtures.ts'
import { todayInTimeZone } from '../../lib/dates.ts'
import { server } from '../../test/msw/server.ts'
import { renderApp } from '../../test/render-app.tsx'

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

const recurring = {
  id: 'rec-1',
  userId: 'user-1',
  cashAccountId: 'acc-1',
  categoryId: 'cat-1',
  name: 'Renta',
  amount: 1200000,
  amountType: 'FIXED',
  paymentMethod: 'CASH_ACCOUNT',
  frequency: 'MONTHLY',
  config: '{"day":1}',
  nonBusinessDayRule: 'NONE',
  useHolidays: true,
  startDate: '2026-01-01',
  endDate: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  category: { id: 'cat-1', name: 'Vivienda' },
}

const occurrence = {
  recurringExpenseId: 'rec-1',
  name: 'Renta',
  expectedDate: '2026-11-01',
  amount: 1200000,
  categoryId: 'cat-1',
  daysUntil: 27,
}

function baseHandlers() {
  return [
    refreshOk,
    settingsHandler,
    http.get(`${API_BASE}/api/v1/cash-accounts`, () => HttpResponse.json([account])),
    http.get(`${API_BASE}/api/v1/categories`, () => HttpResponse.json([])),
    http.get(`${API_BASE}/api/v1/recurring-expenses`, () => HttpResponse.json([recurring])),
    http.get(`${API_BASE}/api/v1/recurring-expenses/upcoming`, () =>
      HttpResponse.json({
        today: '2026-10-05',
        timezone: 'America/Mexico_City',
        horizonDays: 60,
        occurrences: [occurrence],
      }),
    ),
  ]
}

describe('gastos recurrentes', () => {
  it('lista recurrentes y confirma una ocurrencia', async () => {
    let confirmed: { id: string; body: Record<string, unknown> } | null = null

    server.use(
      ...baseHandlers(),
      http.post(`${API_BASE}/api/v1/recurring-expenses/:id/confirm`, async ({ request, params }) => {
        confirmed = { id: params.id as string, body: (await request.json()) as Record<string, unknown> }
        return HttpResponse.json({ expenseId: 'exp-1', movementId: 'mov-1' }, { status: 201 })
      }),
    )

    renderApp(['/recurrentes'])
    const user = userEvent.setup()

    const upcoming = await screen.findByTestId('upcoming-occurrences')
    await user.click(within(upcoming).getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(confirmed).not.toBeNull())
    expect(confirmed?.id).toBe('rec-1')
    expect(confirmed?.body.occurrenceDate).toBe('2026-11-01')
    expect(confirmed?.body.actualDate).toBe(todayInTimeZone(userSettingsFixture.timezone))
    expect(await screen.findByText(/Ocurrencia confirmada/)).toBeInTheDocument()
  })

  it('crea un recurrente con calendario mensual', async () => {
    let created: Record<string, unknown> | null = null

    server.use(
      ...baseHandlers(),
      http.post(`${API_BASE}/api/v1/recurring-expenses`, async ({ request }) => {
        created = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(recurring, { status: 201 })
      }),
    )

    renderApp(['/recurrentes'])
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Nuevo recurrente' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Nombre'), 'Internet')
    await user.type(within(dialog).getByLabelText('Monto'), '800')
    await user.click(within(dialog).getByRole('button', { name: 'Crear recurrente' }))

    await waitFor(() => expect(created).not.toBeNull())
    expect(created?.name).toBe('Internet')
    expect(created?.amount).toBe(80000)
    const schedule = created?.schedule as Record<string, unknown>
    expect(schedule.frequency).toBe('MONTHLY')
    expect(schedule.config).toEqual({ day: 1 })
    expect(schedule.startDate).toBe(todayInTimeZone(userSettingsFixture.timezone))
  })

  it('elimina un recurrente con confirmación', async () => {
    let deletedId: string | null = null

    server.use(
      ...baseHandlers(),
      http.delete(`${API_BASE}/api/v1/recurring-expenses/:id`, ({ params }) => {
        deletedId = params.id as string
        return new HttpResponse(null, { status: 204 })
      }),
    )

    renderApp(['/recurrentes'])
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Eliminar' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => expect(deletedId).toBe('rec-1'))
  })
})
