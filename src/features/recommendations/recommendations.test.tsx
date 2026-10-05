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

const result = {
  historyId: 'rec-1',
  outcome: 'CARD',
  recommended: {
    kind: 'CARD',
    cardId: 'card-1',
    cardAlias: 'Oro',
    eligible: true,
    eliminatedBy: [],
    score: 89,
    level: 'EXCELLENT',
    reasons: [{ code: 'NO_INTEREST', message: 'Sin intereses: pagarías el total sin costo adicional.' }],
    warnings: [],
    cutDate: '2026-10-15',
    dueDate: '2026-11-04',
    financingDays: 30,
    minimumProjectedBalance: 1750000,
    minimumProjectedDate: '2026-11-04',
    interestCost: 0,
    utilizationBpsAfter: 833,
    paymentPlan: [{ date: '2026-11-04', amount: 250000 }],
  },
  alternatives: [
    {
      kind: 'CASH',
      eligible: true,
      eliminatedBy: [],
      score: 75,
      level: 'GOOD',
      reasons: [],
      warnings: [],
      financingDays: 0,
      minimumProjectedBalance: 1500000,
      minimumProjectedDate: '2026-10-05',
      interestCost: 0,
      paymentPlan: [],
    },
    {
      kind: 'CARD',
      cardId: 'card-2',
      cardAlias: 'Plata',
      eligible: false,
      eliminatedBy: [
        { code: 'CREDIT_AVAILABLE', message: 'Plata no tiene crédito suficiente.' },
      ],
      score: 0,
      level: 'NOT_RECOMMENDED',
      reasons: [],
      warnings: [],
      financingDays: 0,
      minimumProjectedBalance: 0,
      minimumProjectedDate: '2026-10-05',
      interestCost: 0,
      paymentPlan: [],
    },
  ],
  suggestions: [],
  comparison: { financingDays: 30, interestCost: 0, utilizationBpsAfter: 833 },
  disclaimer: 'Esta recomendación no constituye asesoría financiera profesional.',
  engineVersion: '1.0.0',
  evaluatedAt: '2026-10-05T12:00:00.000Z',
}

const historyItem = {
  id: 'rec-1',
  outcome: 'CARD',
  score: 89,
  engineVersion: '1.0.0',
  recommendedCard: { id: 'card-1', alias: 'Oro', last4: '4321' },
  requestInput: { amount: 250000, purchaseDate: '2026-10-05', type: 'REGULAR' },
  createdAt: '2026-10-05T12:00:00.000Z',
}

const rules = [
  {
    code: 'CASHFLOW_NON_NEGATIVE',
    kind: 'ELIMINATORY',
    name: 'Flujo de efectivo no negativo',
    description: 'La proyección no debe quedar por debajo de cero.',
    isEnabled: true,
    weight: 0,
    params: {},
    isOverridden: false,
  },
  {
    code: 'NO_INTEREST',
    kind: 'SCORING',
    name: 'Sin intereses',
    description: 'Premia pagar el total sin costo.',
    isEnabled: true,
    weight: 35,
    params: {},
    isOverridden: true,
  },
]

function baseHandlers() {
  return [
    refreshOk,
    settingsHandler,
    http.get(`${API_BASE}/api/v1/cards`, () => HttpResponse.json([card])),
    http.get(`${API_BASE}/api/v1/categories`, () => HttpResponse.json([])),
  ]
}

describe('recomendador', () => {
  it('recomienda con motivos, alternativas y disclaimer', async () => {
    let created: Record<string, unknown> | null = null

    server.use(
      ...baseHandlers(),
      http.post(`${API_BASE}/api/v1/recommendations`, async ({ request }) => {
        created = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(result, { status: 201 })
      }),
    )

    renderApp(['/recomendador'])
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Monto de la compra'), '2500')
    await user.click(screen.getByRole('button', { name: 'Recomendar' }))

    await waitFor(() => expect(created).not.toBeNull())
    expect(created?.amount).toBe(250000)
    expect(created?.type).toBe('REGULAR')
    expect(created?.purchaseDate).toBe(todayInTimeZone(userSettingsFixture.timezone))

    const view = await screen.findByTestId('recommendation-result')
    expect(within(view).getByText('Oro')).toBeInTheDocument()
    expect(within(view).getByText('Excelente')).toBeInTheDocument()
    expect(within(view).getByText('Puntaje 89/100')).toBeInTheDocument()
    expect(within(view).getByText(/Sin intereses/)).toBeInTheDocument()
    expect(within(view).getByText('Plata')).toBeInTheDocument()
    expect(within(view).getByText(/no tiene crédito suficiente/)).toBeInTheDocument()
    expect(screen.getByText(/no constituye asesoría financiera/)).toBeInTheDocument()
  })

  it('muestra el historial y su detalle reproducible', async () => {
    server.use(
      ...baseHandlers(),
      http.get(`${API_BASE}/api/v1/recommendations`, () =>
        HttpResponse.json({ data: [historyItem], meta: { limit: 20, nextCursor: null, hasMore: false } }),
      ),
      http.get(`${API_BASE}/api/v1/recommendations/rec-1`, () =>
        HttpResponse.json({
          ...historyItem,
          contextSnapshot: { settings: { today: '2026-10-05' } },
          rulesSnapshot: [],
          result,
        }),
      ),
    )

    renderApp(['/recomendaciones'])
    const user = userEvent.setup()

    const list = await screen.findByTestId('recommendations-list')
    expect(within(list).getByText(/Oro ····4321/)).toBeInTheDocument()
    expect(within(list).getByText(/\$2,500\.00/)).toBeInTheDocument()

    await user.click(within(list).getByRole('button', { name: 'Ver detalle' }))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByTestId('recommendation-result')).toBeInTheDocument()
    expect(within(dialog).getByText('Contexto y reglas guardadas')).toBeInTheDocument()
  })

  it('guarda y restablece personalizaciones de reglas', async () => {
    let override: { code: string; body: Record<string, unknown> } | null = null
    let resetted: string | null = null

    server.use(
      ...baseHandlers(),
      http.get(`${API_BASE}/api/v1/recommendation-rules`, () => HttpResponse.json(rules)),
      http.put(`${API_BASE}/api/v1/recommendation-rules/:code/override`, async ({ request, params }) => {
        override = { code: params.code as string, body: (await request.json()) as Record<string, unknown> }
        return HttpResponse.json(rules)
      }),
      http.delete(`${API_BASE}/api/v1/recommendation-rules/:code/override`, ({ params }) => {
        resetted = params.code as string
        return new HttpResponse(null, { status: 204 })
      }),
    )

    renderApp(['/reglas'])
    const user = userEvent.setup()

    const list = await screen.findByTestId('rules-list')
    const cashflowRule = within(list)
      .getByText('Flujo de efectivo no negativo')
      .closest('li') as HTMLElement
    await user.click(within(cashflowRule).getByRole('checkbox'))

    await waitFor(() => expect(override).not.toBeNull())
    expect(override?.code).toBe('CASHFLOW_NON_NEGATIVE')
    expect(override?.body.isEnabled).toBe(false)

    const noInterestRule = within(list).getByText('Sin intereses').closest('li') as HTMLElement
    expect(within(noInterestRule).getByText('Personalizada')).toBeInTheDocument()
    await user.click(within(noInterestRule).getByRole('button', { name: 'Restablecer' }))

    await waitFor(() => expect(resetted).toBe('NO_INTEREST'))
  })
})
