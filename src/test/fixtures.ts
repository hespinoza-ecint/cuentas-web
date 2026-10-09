import { HttpResponse, http } from 'msw'
import type { AuthUser } from '../lib/auth/session.ts'

export const API_BASE = 'http://cuentas.test'

export const testUser: AuthUser = {
  id: 'user-1',
  email: 'ana@test.local',
  firstName: 'Ana',
  lastName: 'López',
  role: 'USER',
  status: 'ACTIVE',
  emailVerified: true,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

/** Respuesta de error RFC 9457 como la sirve el backend. */
export function problem(
  status: number,
  body: Record<string, unknown>,
): HttpResponse<Record<string, unknown>> {
  return HttpResponse.json(
    { type: 'about:blank', status, ...body },
    { status, headers: { 'content-type': 'application/problem+json' } },
  )
}

export function authResponse(accessToken: string) {
  return { accessToken, tokenType: 'Bearer', expiresInSeconds: 900, user: testUser }
}

/** Renovación exitosa: la app arranca autenticada en las pruebas. */
export const refreshOk = http.post(`${API_BASE}/api/v1/auth/refresh`, () =>
  HttpResponse.json(authResponse('tok-1')),
)

export const userSettingsFixture = {
  timezone: 'America/Mexico_City',
  locale: 'es-MX',
  holidayCalendarCode: 'MX_BANKING',
  minCashBuffer: 0,
  maxUtilizationBps: 3000,
  variableIncomeFactorBps: 9000,
  pendingIncomeGraceDays: 3,
  backdateLimitDays: 60,
  projectionMinDays: 60,
  updatedAt: '2026-10-01T00:00:00.000Z',
}

export const settingsHandler = http.get(`${API_BASE}/api/v1/users/me/settings`, () =>
  HttpResponse.json(userSettingsFixture),
)

/** Resumen y proyección vacíos: para pruebas que solo llegan al inicio. */
export const emptyDashboardHandlers = [
  http.get(`${API_BASE}/api/v1/dashboard/summary`, () =>
    HttpResponse.json({
      today: '2026-10-05',
      timezone: 'America/Mexico_City',
      month: '2026-10',
      cash: { spendableBalance: 0, totalBalance: 0, accountCount: 0 },
      cards: { totalDebt: 0, totalAvailableCredit: 0, items: [] },
      upcomingIncome: { horizonDays: 30, total: 0, items: [] },
      upcomingPayments: { horizonDays: 30, total: 0, items: [] },
      expenses: {
        month: '2026-10',
        spent: 0,
        previousMonth: '2026-09',
        previousSpent: 0,
        topCategories: [],
      },
      lastRecommendation: null,
    }),
  ),
  http.get(`${API_BASE}/api/v1/cashflow/projection`, () =>
    HttpResponse.json({
      today: '2026-10-05',
      from: '2026-10-05',
      to: '2026-11-04',
      timezone: 'America/Mexico_City',
      horizonDays: 30,
      startingBalance: 0,
      minCashBuffer: 0,
      points: [],
      minimum: { date: '2026-10-05', balance: 0 },
      finalBalance: 0,
      belowBuffer: false,
    }),
  ),
]
