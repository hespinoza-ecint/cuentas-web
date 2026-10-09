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

const baseMovement = {
  userId: 'user-1',
  cashAccountId: 'acc-1',
  reversesMovementId: null,
  reason: null,
  sourceType: null,
  sourceId: null,
  createdById: 'user-1',
  createdAt: '2026-10-04T12:00:00.000Z',
}

const page1 = {
  data: [
    {
      ...baseMovement,
      id: 'm-1',
      type: 'EXPENSE',
      amount: -15000,
      occurredOn: '2026-10-04',
      description: 'Supermercado',
    },
    {
      ...baseMovement,
      id: 'm-2',
      type: 'INCOME',
      amount: 100000,
      occurredOn: '2026-10-03',
      description: 'Sueldo',
    },
  ],
  meta: { limit: 20, nextCursor: 'm-2', hasMore: true },
}

const page2 = {
  data: [
    {
      ...baseMovement,
      id: 'm-3',
      type: 'OPENING_BALANCE',
      amount: 500000,
      occurredOn: '2026-10-01',
      description: 'Apertura de cuenta',
    },
  ],
  meta: { limit: 20, nextCursor: null, hasMore: false },
}

function accountsHandler() {
  return http.get(`${API_BASE}/api/v1/cash-accounts`, () => HttpResponse.json([account]))
}

describe('movimientos', () => {
  it('lista movimientos y carga la siguiente página con cursor', async () => {
    server.use(
      refreshOk,
      settingsHandler,
      accountsHandler(),
      http.get(`${API_BASE}/api/v1/cash-movements`, ({ request }) => {
        const url = new URL(request.url)
        return HttpResponse.json(url.searchParams.get('cursor') === 'm-2' ? page2 : page1)
      }),
    )

    renderApp(['/movimientos'])
    const user = userEvent.setup()

    expect(await screen.findByText('Supermercado')).toBeInTheDocument()
    expect(screen.getByText('Sueldo')).toBeInTheDocument()
    const list = screen.getByTestId('movements-list')
    expect(within(list).queryByText('Apertura de cuenta')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cargar más' }))

    expect(await within(list).findByText('Apertura de cuenta')).toBeInTheDocument()
  })

  it('registra un ajuste manual con motivo y monto negativo', async () => {
    let created: Record<string, unknown> | null = null

    server.use(
      refreshOk,
      settingsHandler,
      accountsHandler(),
      http.get(`${API_BASE}/api/v1/cash-movements`, () => HttpResponse.json(page1)),
      http.post(`${API_BASE}/api/v1/cash-movements/adjustments`, async ({ request }) => {
        created = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          { ...baseMovement, id: 'm-new', type: 'ADJUSTMENT', amount: -15000, occurredOn: '2026-10-05', description: 'Corrección' },
          { status: 201 },
        )
      }),
    )

    renderApp(['/movimientos'])
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Ajuste manual' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Monto (puede ser negativo)'), '-150')
    await user.type(within(dialog).getByLabelText('Descripción'), 'Corrección')
    await user.type(within(dialog).getByLabelText('Motivo'), 'Conteo de caja')
    await user.click(within(dialog).getByRole('button', { name: 'Registrar ajuste' }))

    await waitFor(() => expect(created).not.toBeNull())
    expect(created?.cashAccountId).toBe('acc-1')
    expect(created?.amount).toBe(-15000)
    expect(created?.reason).toBe('Conteo de caja')
    expect(created?.occurredOn).toBe(todayInTimeZone(userSettingsFixture.timezone))
  })

  it('revierte un movimiento pidiendo el motivo', async () => {
    let reversed: { id: string; body: Record<string, unknown> } | null = null

    server.use(
      refreshOk,
      settingsHandler,
      accountsHandler(),
      http.get(`${API_BASE}/api/v1/cash-movements`, () => HttpResponse.json(page1)),
      http.post(`${API_BASE}/api/v1/cash-movements/:id/reverse`, async ({ request, params }) => {
        reversed = {
          id: params.id as string,
          body: (await request.json()) as Record<string, unknown>,
        }
        return HttpResponse.json(
          { ...baseMovement, id: 'm-rev', type: 'REVERSAL', amount: 15000, occurredOn: '2026-10-05', description: 'Supermercado' },
          { status: 201 },
        )
      }),
    )

    renderApp(['/movimientos'])
    const user = userEvent.setup()

    const row = (await screen.findByText('Supermercado')).closest('li') as HTMLElement
    await user.click(within(row).getByRole('button', { name: 'Más acciones de Supermercado' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Revertir' }))

    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Motivo'), 'Registrado por error')
    await user.click(within(dialog).getByRole('button', { name: 'Revertir' }))

    await waitFor(() => expect(reversed).not.toBeNull())
    expect(reversed?.id).toBe('m-1')
    expect(reversed?.body.reason).toBe('Registrado por error')
  })
})
