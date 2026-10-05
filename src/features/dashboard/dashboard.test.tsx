import { screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { API_BASE, problem, refreshOk } from '../../test/fixtures.ts'
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
  timezone: 'America/Mexico_City',
  horizonDays: 60,
  startingBalance: 975000,
  minCashBuffer: 100000,
  points: [],
  minimum: { date: '2026-10-26', balance: -50000 },
  finalBalance: 100000,
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
    server.use(refreshOk, summaryHandler(), projectionHandler())
    renderApp(['/'])

    expect(await screen.findByText('Hola, Ana')).toBeInTheDocument()
    expect(await screen.findByText('$9,750.00')).toBeInTheDocument()
    expect(screen.getByText('$12,000.00')).toBeInTheDocument()
    expect(screen.getByText('-$500.00')).toBeInTheDocument()
    expect(screen.getByText('Por debajo del colchón')).toBeInTheDocument()
    expect(screen.getByText('20.0%')).toBeInTheDocument()
    expect(screen.getByText('Oro ····4321')).toBeInTheDocument()
    expect(screen.getByText('Bono')).toBeInTheDocument()
    expect(screen.getByText('Pago Oro (corte 2026-10-05)')).toBeInTheDocument()
    expect(screen.getByText('Supermercado')).toBeInTheDocument()
  })

  it('muestra el error del resumen con opción de reintentar', async () => {
    server.use(
      refreshOk,
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
