import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { addDays, todayInTimeZone } from '../../lib/dates.ts'
import {
  API_BASE,
  emptyDashboardHandlers,
  problem,
  refreshOk,
  settingsHandler,
  userSettingsFixture,
} from '../../test/fixtures.ts'
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
    // El color del minimo lo decide el colchon (rojo si queda debajo), no el signo.
    const minimums = screen.getAllByText('-$500.00')
    expect(minimums.some((el) => el.classList.contains('text-danger'))).toBe(true)
    expect(minimums.some((el) => el.classList.contains('text-income'))).toBe(false)
    expect(screen.getByText('20.0%')).toBeInTheDocument()
    expect(screen.getByText('Oro ····4321')).toBeInTheDocument()
    expect(screen.getByText('Bono')).toBeInTheDocument()
    expect(screen.getByText('Pago Oro (corte 2026-10-05)')).toBeInTheDocument()
    // La fecha de pago va en su propia linea: no se recorta con la descripcion.
    expect(screen.getByText('Corte · 26 oct 2026 · en 21 días')).not.toHaveClass('truncate')
    // Tarjeta con pago pendiente: dice cuanto y para cuando.
    expect(screen.getByText(/antes del 26 oct 2026 · en 21 días/)).toBeInTheDocument()
    expect(screen.getByRole('meter', { name: 'Utilización de Oro' })).toHaveAttribute(
      'aria-valuenow',
      '20',
    )
    // Los campos de fecha conservan los 16px de control.ts (sin zoom en iOS).
    expect(screen.getByLabelText('Hasta')).not.toHaveClass('text-xs')
    expect(screen.getByText('Supermercado')).toBeInTheDocument()
  })

  it('sin cuentas ni tarjetas muestra por donde empezar en lugar de un tablero en ceros', async () => {
    server.use(refreshOk, settingsHandler, ...emptyDashboardHandlers)
    renderApp(['/'])

    expect(await screen.findByText('Empieza por aquí')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Crea una cuenta de efectivo/ })).toHaveAttribute(
      'href',
      '/cuentas',
    )
    expect(screen.queryByText('Efectivo disponible')).not.toBeInTheDocument()
  })

  it('muestra los primeros pagos por fecha y el resto al pedirlo', async () => {
    const items = [6, 5, 4, 3, 2, 1].map((day) => ({
      type: 'RECURRING_EXPENSE',
      description: `Servicio ${day}`,
      date: `2026-10-${String(day + 4).padStart(2, '0')}`,
      amount: 10000,
      cardAlias: null,
    }))
    server.use(
      refreshOk,
      settingsHandler,
      http.get(`${API_BASE}/api/v1/dashboard/summary`, () =>
        HttpResponse.json({
          ...summary,
          upcomingPayments: { horizonDays: 30, total: 60000, items },
        }),
      ),
      projectionHandler(),
    )
    renderApp(['/'])

    const list = await screen.findByTestId('dashboard-payments')
    // Llegan desordenados: se muestran los 4 mas proximos, el primero es "hoy".
    expect(within(list).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('Servicio 1'),
      expect.stringContaining('Servicio 2'),
      expect.stringContaining('Servicio 3'),
      expect.stringContaining('Servicio 4'),
    ])
    expect(within(list).getByText(/5 oct 2026 · hoy/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ver los 6 pagos' }))
    expect(within(list).getAllByRole('listitem')).toHaveLength(6)
  })

  it('usa la utilización máxima del usuario para el nivel de uso de cada tarjeta', async () => {
    server.use(
      refreshOk,
      http.get(`${API_BASE}/api/v1/users/me/settings`, () =>
        HttpResponse.json({ ...userSettingsFixture, maxUtilizationBps: 1000 }),
      ),
      http.get(`${API_BASE}/api/v1/dashboard/summary`, () =>
        HttpResponse.json({
          ...summary,
          cards: {
            ...summary.cards,
            items: [{ ...summary.cards.items[0], utilizationBps: 1500 }],
          },
        }),
      ),
      projectionHandler(),
    )
    renderApp(['/'])

    expect(await screen.findByText('Hola, Ana')).toBeInTheDocument()
    // 15% supera el máximo del usuario (10%) y queda debajo del doble: uso medio.
    expect(await screen.findByText(/Uso medio/)).toBeInTheDocument()
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
