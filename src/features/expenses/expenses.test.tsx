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

const category = {
  id: 'cat-1',
  userId: null,
  parentId: null,
  name: 'Alimentos',
  kind: 'EXPENSE',
  icon: null,
  isSystem: true,
}

const expense = {
  id: 'exp-1',
  userId: 'user-1',
  cashAccountId: 'acc-1',
  categoryId: 'cat-1',
  recurringExpenseId: null,
  cashMovementId: 'mov-1',
  description: 'Supermercado',
  amount: 25000,
  expenseDate: '2026-10-04',
  occurrenceDate: null,
  status: 'PAID',
  notes: null,
  createdAt: '2026-10-04T12:00:00.000Z',
  updatedAt: '2026-10-04T12:00:00.000Z',
  category: { id: 'cat-1', name: 'Alimentos' },
}

function baseHandlers() {
  return [
    refreshOk,
    settingsHandler,
    http.get(`${API_BASE}/api/v1/cash-accounts`, () => HttpResponse.json([account])),
    http.get(`${API_BASE}/api/v1/categories`, () => HttpResponse.json([category])),
  ]
}

describe('gastos', () => {
  it('lista los gastos con monto y categoría', async () => {
    server.use(
      ...baseHandlers(),
      http.get(`${API_BASE}/api/v1/expenses`, () =>
        HttpResponse.json({ data: [expense], meta: { limit: 20, nextCursor: null, hasMore: false } }),
      ),
    )

    renderApp(['/gastos'])

    expect(await screen.findByText('Supermercado')).toBeInTheDocument()
    const list = screen.getByTestId('expenses-list')
    expect(within(list).getByText('Alimentos')).toBeInTheDocument()
    expect(screen.getByText('-$250.00')).toBeInTheDocument()
  })

  it('registra un gasto con el monto en centavos', async () => {
    let created: Record<string, unknown> | null = null

    server.use(
      ...baseHandlers(),
      http.get(`${API_BASE}/api/v1/expenses`, () =>
        HttpResponse.json({ data: [], meta: { limit: 20, nextCursor: null, hasMore: false } }),
      ),
      http.post(`${API_BASE}/api/v1/expenses`, async ({ request }) => {
        created = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(expense, { status: 201 })
      }),
    )

    renderApp(['/gastos'])
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Registrar gasto' }))
    const dialog = await screen.findByRole('dialog')
    await user.selectOptions(within(dialog).getByLabelText('Categoría (opcional)'), 'cat-1')
    await user.type(within(dialog).getByLabelText('Descripción'), 'Café')
    await user.type(within(dialog).getByLabelText('Monto'), '450')
    await user.click(within(dialog).getByRole('button', { name: 'Registrar gasto' }))

    await waitFor(() => expect(created).not.toBeNull())
    expect(created?.cashAccountId).toBe('acc-1')
    expect(created?.categoryId).toBe('cat-1')
    expect(created?.amount).toBe(45000)
    expect(created?.expenseDate).toBe(todayInTimeZone(userSettingsFixture.timezone))
  })

  it('revierte un gasto con motivo', async () => {
    let reversed: { id: string; body: Record<string, unknown> } | null = null

    server.use(
      ...baseHandlers(),
      http.get(`${API_BASE}/api/v1/expenses`, () =>
        HttpResponse.json({ data: [expense], meta: { limit: 20, nextCursor: null, hasMore: false } }),
      ),
      http.post(`${API_BASE}/api/v1/expenses/:id/reverse`, async ({ request, params }) => {
        reversed = { id: params.id as string, body: (await request.json()) as Record<string, unknown> }
        return HttpResponse.json({ expenseId: 'exp-1', reversalMovementId: 'mov-2' }, { status: 201 })
      }),
    )

    renderApp(['/gastos'])
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Revertir' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Motivo'), 'Compra duplicada')
    await user.click(within(dialog).getByRole('button', { name: 'Revertir' }))

    await waitFor(() => expect(reversed).not.toBeNull())
    expect(reversed?.id).toBe('exp-1')
    expect(reversed?.body.reason).toBe('Compra duplicada')
  })
})
