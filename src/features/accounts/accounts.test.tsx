import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { todayInTimeZone } from '../../lib/dates.ts'
import { API_BASE, problem, refreshOk, settingsHandler, userSettingsFixture } from '../../test/fixtures.ts'
import { server } from '../../test/msw/server.ts'
import { renderApp } from '../../test/render-app.tsx'

const accounts = [
  {
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
  },
  {
    id: 'acc-2',
    userId: 'user-1',
    name: 'Efectivo',
    type: 'CASH',
    isSpendable: true,
    isDefault: false,
    currency: 'MXN',
    currentBalance: 25000,
    balanceVersion: 1,
    status: 'ACTIVE',
    lastReconciledAt: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  },
]

function accountsHandler() {
  return http.get(`${API_BASE}/api/v1/cash-accounts`, () => HttpResponse.json(accounts))
}

describe('cuentas de efectivo', () => {
  it('lista las cuentas con su saldo formateado', async () => {
    server.use(refreshOk, settingsHandler, accountsHandler())
    renderApp(['/cuentas'])

    expect(await screen.findByText('Débito BBVA')).toBeInTheDocument()
    expect(screen.getByText('Efectivo')).toBeInTheDocument()
    expect(screen.getByText('$5,000.00')).toBeInTheDocument()
    expect(screen.getByText('$250.00')).toBeInTheDocument()
    expect(screen.getByText('Predeterminada')).toBeInTheDocument()
  })

  it('crea una cuenta con saldo inicial en centavos', async () => {
    let created: Record<string, unknown> | null = null
    server.use(
      refreshOk,
      settingsHandler,
      accountsHandler(),
      http.post(`${API_BASE}/api/v1/cash-accounts`, async ({ request }) => {
        created = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...accounts[0], id: 'acc-3', name: 'Ahorro' }, { status: 201 })
      }),
    )

    renderApp(['/cuentas'])
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Nueva cuenta' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Nombre'), 'Ahorro')
    await user.selectOptions(within(dialog).getByLabelText('Tipo'), 'SAVINGS')
    await user.type(within(dialog).getByLabelText('Saldo inicial (opcional)'), '1000')
    await user.click(within(dialog).getByRole('button', { name: 'Crear cuenta' }))

    await waitFor(() => expect(created).not.toBeNull())
    expect(created?.name).toBe('Ahorro')
    expect(created?.type).toBe('SAVINGS')
    expect(created?.openingBalance).toBe(100000)
    expect(created?.openingDate).toBe(todayInTimeZone(userSettingsFixture.timezone))
  })

  it('transfiere entre cuentas distintas', async () => {
    let transferred: Record<string, unknown> | null = null
    server.use(
      refreshOk,
      settingsHandler,
      accountsHandler(),
      http.post(`${API_BASE}/api/v1/cash-accounts/transfer`, async ({ request }) => {
        transferred = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          { transferId: 't-1', outMovementId: 'm-1', inMovementId: 'm-2' },
          { status: 201 },
        )
      }),
    )

    renderApp(['/cuentas'])
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Transferir' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Monto'), '100')
    await user.click(within(dialog).getByRole('button', { name: 'Transferir' }))

    await waitFor(() => expect(transferred).not.toBeNull())
    expect(transferred?.fromAccountId).toBe('acc-1')
    expect(transferred?.toAccountId).toBe('acc-2')
    expect(transferred?.amount).toBe(10000)
  })

  it('muestra el error al intentar eliminar una cuenta con saldo', async () => {
    server.use(
      refreshOk,
      settingsHandler,
      accountsHandler(),
      http.delete(`${API_BASE}/api/v1/cash-accounts/:id`, () =>
        problem(422, {
          title: 'Unprocessable',
          detail: 'No se puede eliminar una cuenta con saldo distinto de cero.',
          code: 'UNPROCESSABLE_ENTITY',
          reason: 'ACCOUNT_WITH_BALANCE',
        }),
      ),
    )

    renderApp(['/cuentas'])
    const user = userEvent.setup()

    const row = await screen.findByText('Débito BBVA')
    const card = row.closest('li') as HTMLElement
    await user.click(within(card).getByRole('button', { name: 'Eliminar' }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText(/saldo distinto de cero/)).toBeInTheDocument()
  })
})
