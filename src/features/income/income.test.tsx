import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { todayInTimeZone } from '../../lib/dates.ts'
import { API_BASE, refreshOk, settingsHandler, userSettingsFixture } from '../../test/fixtures.ts'
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

const source = {
  id: 'src-1',
  userId: 'user-1',
  cashAccountId: 'acc-1',
  categoryId: null,
  name: 'Sueldo',
  payer: 'Empresa SA',
  amountType: 'FIXED',
  estimatedAmount: 1500000,
  isActive: true,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  cashAccount: { id: 'acc-1', name: 'Débito BBVA' },
  category: null,
  schedules: [
    {
      id: 'sch-1',
      userId: 'user-1',
      incomeSourceId: 'src-1',
      frequency: 'MONTHLY',
      config: { day: 1 },
      nonBusinessDayRule: 'PREVIOUS',
      useHolidays: true,
      amountOverride: null,
      startDate: '2026-01-01',
      endDate: null,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
}

const occurrence = {
  incomeSourceId: 'src-1',
  incomeSourceName: 'Sueldo',
  incomeScheduleId: 'sch-1',
  expectedDate: '2026-11-02',
  expectedAmount: 1500000,
  amountType: 'FIXED',
  overdue: false,
  daysUntil: 28,
}

const transaction = {
  id: 'tx-1',
  userId: 'user-1',
  incomeSourceId: 'src-1',
  incomeScheduleId: 'sch-1',
  cashMovementId: 'mov-1',
  expectedDate: '2026-10-01',
  expectedAmount: 1500000,
  actualDate: '2026-10-01',
  actualAmount: 1550000,
  status: 'CONFIRMED',
  notes: 'Incluyó bono',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  incomeSource: { id: 'src-1', name: 'Sueldo' },
}

function baseHandlers() {
  return [
    refreshOk,
    settingsHandler,
    http.get(`${API_BASE}/api/v1/cash-accounts`, () => HttpResponse.json([account])),
    http.get(`${API_BASE}/api/v1/categories`, () => HttpResponse.json([])),
    http.get(`${API_BASE}/api/v1/income/sources`, () => HttpResponse.json([source])),
    http.get(`${API_BASE}/api/v1/income/upcoming`, () =>
      HttpResponse.json({
        today: '2026-10-05',
        timezone: 'America/Mexico_City',
        graceDays: 3,
        horizonDays: 60,
        occurrences: [occurrence],
      }),
    ),
    http.get(`${API_BASE}/api/v1/income/transactions`, () =>
      HttpResponse.json({
        data: [transaction],
        meta: { limit: 20, nextCursor: null, hasMore: false },
      }),
    ),
  ]
}

describe('ingresos', () => {
  it('muestra próximos, fuentes e historial', async () => {
    server.use(...baseHandlers())
    renderApp(['/ingresos'])

    const upcoming = await screen.findByTestId('income-upcoming')
    expect(within(upcoming).getByText('Sueldo')).toBeInTheDocument()
    expect(within(upcoming).getByText('$15,000.00')).toBeInTheDocument()

    const sources = screen.getByTestId('income-sources')
    expect(within(sources).getByText('Mensual (día 1)')).toBeInTheDocument()
    expect(within(sources).getByText('Empresa SA', { exact: false })).toBeInTheDocument()

    const history = screen.getByTestId('income-history')
    expect(within(history).getByText('Confirmado')).toBeInTheDocument()
    expect(within(history).getByText(/\$15,500\.00/)).toBeInTheDocument()
  })

  it('confirma un ingreso con el monto real', async () => {
    let confirmed: Record<string, unknown> | null = null

    server.use(
      ...baseHandlers(),
      http.post(`${API_BASE}/api/v1/income/transactions/confirm`, async ({ request }) => {
        confirmed = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(transaction, { status: 201 })
      }),
    )

    renderApp(['/ingresos'])
    const user = userEvent.setup()

    const upcoming = await screen.findByTestId('income-upcoming')
    await user.click(within(upcoming).getByRole('button', { name: 'Confirmar' }))

    const dialog = await screen.findByRole('dialog')
    const amount = within(dialog).getByLabelText('Monto recibido')
    await user.clear(amount)
    await user.type(amount, '5000')
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar ingreso' }))

    await waitFor(() => expect(confirmed).not.toBeNull())
    expect(confirmed?.incomeSourceId).toBe('src-1')
    expect(confirmed?.incomeScheduleId).toBe('sch-1')
    expect(confirmed?.expectedDate).toBe('2026-11-02')
    expect(confirmed?.actualAmount).toBe(500000)
    expect(confirmed?.actualDate).toBe(todayInTimeZone(userSettingsFixture.timezone))
  })

  it('omite una fecha estimada', async () => {
    let skipped: Record<string, unknown> | null = null

    server.use(
      ...baseHandlers(),
      http.post(`${API_BASE}/api/v1/income/transactions/skip`, async ({ request }) => {
        skipped = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...transaction, status: 'SKIPPED' }, { status: 201 })
      }),
    )

    renderApp(['/ingresos'])
    const user = userEvent.setup()

    const upcoming = await screen.findByTestId('income-upcoming')
    await user.click(within(upcoming).getByRole('button', { name: /Más acciones del ingreso/ }))
    await user.click(await screen.findByRole('menuitem', { name: 'Omitir esta fecha' }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Omitir' }))

    await waitFor(() => expect(skipped).not.toBeNull())
    expect(skipped?.expectedDate).toBe('2026-11-02')
    expect(await screen.findByText('Fecha omitida: ya no se proyecta.')).toBeInTheDocument()
  })

  it('crea una fuente con su primer calendario', async () => {
    let created: Record<string, unknown> | null = null

    server.use(
      ...baseHandlers(),
      http.post(`${API_BASE}/api/v1/income/sources`, async ({ request }) => {
        created = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(source, { status: 201 })
      }),
    )

    renderApp(['/ingresos'])
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Nueva fuente' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Nombre'), 'Freelance')
    await user.type(within(dialog).getByLabelText('Monto estimado'), '8000')
    await user.click(within(dialog).getByRole('button', { name: 'Crear fuente' }))

    await waitFor(() => expect(created).not.toBeNull())
    expect(created?.name).toBe('Freelance')
    expect(created?.estimatedAmount).toBe(800000)
    const schedules = created?.schedules as Record<string, unknown>[]
    expect(schedules).toHaveLength(1)
    expect(schedules[0].frequency).toBe('MONTHLY')
    expect(schedules[0].config).toEqual({ day: 1 })
    expect(schedules[0].startDate).toBe(todayInTimeZone(userSettingsFixture.timezone))
  })
})
