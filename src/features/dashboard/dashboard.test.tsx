import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { addDays, todayInTimeZone } from '../../lib/dates.ts'
import { API_BASE, problem, refreshOk, settingsHandler } from '../../test/fixtures.ts'
import { server } from '../../test/msw/server.ts'
import { renderApp } from '../../test/render-app.tsx'

const summary = {
  today: '2026-10-05',
  timezone: 'America/Mexico_City',
  month: '2026-10',
  cash: { spendableBalance: 975000, totalBalance: 1200000, accountCount: 2 },
  cards: {
    totalDebt: 200000,
    totalAvailableCredit: 800000,
    items: [
      {
        id: 'card-1',
        alias: 'Oro',
        last4: '4321',
        creditLimit: 1000000,
        currentBalance: 200000,
        availableCredit: 800000,
        utilizationBps: 2000,
        nextCutDate: '2026-10-05',
        nextDueDate: '2026-10-26',
        pendingPayment: 200000,
      },
    ],
  },
  upcomingIncome: {
    horizonDays: 30,
    total: 100000,
    items: [
      {
        incomeSourceId: 'inc-1',
        incomeScheduleId: 'sch-1',
        name: 'Bono',
        date: '2026-10-10',
        amount: 100000,
        overdue: false,
      },
    ],
  },
  upcomingPayments: {
    horizonDays: 30,
    total: 200000,
    items: [
      {
        type: 'CARD_STATEMENT',
        description: 'Pago Oro (corte 2026-10-05)',
        date: '2026-10-26',
        amount: 200000,
        cardAlias: 'Oro',
      },
    ],
  },
  expenses: {
    month: '2026-10',
    spent: 25000,
    previousMonth: '2026-09',
    previousSpent: 20000,
    topCategories: [{ categoryId: 'cat-1', name: 'Supermercado', amount: 25000 }],
  },
  lastRecommendation: {
    id: 'rec-1',
    outcome: 'CARD',
    score: 89,
    cardAlias: 'Oro',
    last4: '4321',
    createdAt: '2026-10-04T12:00:00.000Z',
  },
}

const projection = {
  today: '2026-10-05',
  from: '2026-10-05',
  to: '2026-11-04',
  timezone: 'America/Mexico_City',
  horizonDays: 30,
  startingBalance: 975000,
  minCashBuffer: 100000,
  points: [
    {
      date: '2026-10-10',
      inflows: 100000,
      outflows: 0,
      balance: 1075000,
      events: [{ type: 'INCOME', description: 'Bono', amount: 100000 }],
    },
    {
      date: '2026-10-26',
      inflows: 0,
      outflows: 1125000,
      balance: -50000,
      events: [
        { type: 'CARD_STATEMENT', description: 'Pago Oro (corte 2026-10-05)', amount: -1125000 },
      ],
    },
  ],
  minimum: { date: '2026-10-26', balance: -50000 },
  finalBalance: -50000,
  belowBuffer: true,
}

function summaryHandler() {
  return http.get(`${API_BASE}/api/v1/dashboard/summary`, () => HttpResponse.json(summary))
}

function projectionHandler() {
  return http.get(`${API_BASE}/api/v1/cashflow/projection`, () => HttpResponse.json(projection))
}

describe('dashboard', () => {
  it('muestra efectivo, flujo mínimo, tarjetas, próximos movimientos y gastos', async () => {
    server.use(refreshOk, settingsHandler, summaryHandler(), projectionHandler())
    renderApp(['/'])

    expect(await screen.findByText('Hola, Ana')).toBeInTheDocument()
    expect((await screen.findAllByText('$9,750.00')).length).toBeGreaterThan(0)
    expect(screen.getByText('$12,000.00')).toBeInTheDocument()
    expect(screen.getByTestId('cashflow-chart')).toBeInTheDocument()
    expect(screen.getByTestId('cashflow-day-detail')).toBeInTheDocument()
    expect(screen.getByText('Ver como tabla')).toBeInTheDocument()
    expect(screen.getAllByText('-$500.00').length).toBeGreaterThan(0)
    expect(screen.getByText('Por debajo del colchón')).toBeInTheDocument()
    expect(screen.getByText('20.0%')).toBeInTheDocument()
    expect(screen.getByText('Oro ····4321')).toBeInTheDocument()
    expect(screen.getByText('Bono')).toBeInTheDocument()
    expect(screen.getByText('Pago Oro (corte 2026-10-05)')).toBeInTheDocument()
    expect(screen.getByText('Supermercado')).toBeInTheDocument()
  })

  it('permite elegir el rango de fechas de la proyeccion (default 30 dias)', async () => {
    const requested: URLSearchParams[] = []
    const today = todayInTimeZone('America/Mexico_City')

    server.use(
      refreshOk,
      settingsHandler,
      summaryHandler(),
      http.get(`${API_BASE}/api/v1/cashflow/projection`, ({ request }) => {
        requested.push(new URL(request.url).searchParams)
        return HttpResponse.json(projection)
      }),
    )
    renderApp(['/'])

    await screen.findByTestId('cashflow-chart')

    // Default: hoy a hoy + 30 dias.
    expect(requested[0].get('from')).toBe(today)
    expect(requested[0].get('to')).toBe(addDays(today, 30))

    // Cambiar "Hasta" vuelve a pedir la proyeccion con el nuevo rango; la
    // tarjeta sigue visible con los datos previos mientras llega la nueva.
    const until = screen.getByLabelText('Hasta')
    fireEvent.change(until, { target: { value: addDays(today, 90) } })
    expect(screen.getByTestId('cashflow-chart')).toBeInTheDocument()

    await waitFor(() => {
      expect(requested.at(-1)?.get('to')).toBe(addDays(today, 90))
    })
    expect(requested.at(-1)?.get('from')).toBe(today)
  })

  it('recorre el detalle del día con el teclado', async () => {
    server.use(refreshOk, settingsHandler, summaryHandler(), projectionHandler())
    renderApp(['/'])

    const chart = await screen.findByRole('group', { name: 'Flujo de efectivo proyectado' })
    const detail = screen.getByTestId('cashflow-day-detail')

    // Abre en el día del mínimo (26 oct) con sus movimientos.
    expect(within(detail).getByText('26 oct 2026')).toBeInTheDocument()
    expect(within(detail).getByText(/Pago Oro \(corte 2026-10-05\)/)).toBeInTheDocument()

    // Flecha izquierda: el día anterior con movimientos (10 oct, Bono).
    fireEvent.keyDown(chart, { key: 'ArrowLeft' })
    expect(within(detail).getByText('10 oct 2026')).toBeInTheDocument()
    expect(within(detail).getByText(/Ingreso · Bono/)).toBeInTheDocument()

    // La tabla accesible queda disponible en "Ver como tabla".
    expect(screen.getByTestId('cashflow-table')).toBeInTheDocument()
  })

  it('los atajos de ventana ajustan el rango desde hoy', async () => {
    const requested: URLSearchParams[] = []
    const today = todayInTimeZone('America/Mexico_City')

    server.use(
      refreshOk,
      settingsHandler,
      summaryHandler(),
      http.get(`${API_BASE}/api/v1/cashflow/projection`, ({ request }) => {
        requested.push(new URL(request.url).searchParams)
        return HttpResponse.json(projection)
      }),
    )
    renderApp(['/'])
    await screen.findByTestId('cashflow-chart')

    fireEvent.click(screen.getByRole('button', { name: '90 días' }))

    await waitFor(() => {
      expect(requested.at(-1)?.get('to')).toBe(addDays(today, 90))
    })
    expect(requested.at(-1)?.get('from')).toBe(today)
    expect(screen.getByRole('button', { name: '90 días' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '30 días' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('muestra el error del resumen con opción de reintentar', async () => {
    server.use(
      refreshOk,
      settingsHandler,
      http.get(`${API_BASE}/api/v1/dashboard/summary`, () =>
        problem(500, { title: 'Error', detail: 'Error interno del servidor.' }),
      ),
      projectionHandler(),
    )
    renderApp(['/'])

    expect(await screen.findByText('Error interno del servidor.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
