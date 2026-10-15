import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE, refreshOk, settingsHandler } from '../../test/fixtures.ts'
import { server } from '../../test/msw/server.ts'
import { renderApp } from '../../test/render-app.tsx'
import { readPurchasesFile } from './import/read-purchases-file.ts'

vi.mock('./import/read-purchases-file.ts', () => ({
  readPurchasesFile: vi.fn(),
}))

const readMock = vi.mocked(readPurchasesFile)

const card = {
  id: 'card-1',
  userId: 'user-1',
  alias: 'Oro',
  institution: 'Banco A',
  last4: '4321',
  currency: 'MXN',
  status: 'ACTIVE',
  creditLimit: 1000000,
  currentBalance: 0,
  availableCredit: 1000000,
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

function baseHandlers() {
  return [
    refreshOk,
    settingsHandler,
    http.get(`${API_BASE}/api/v1/cards`, () => HttpResponse.json([card])),
    http.get(`${API_BASE}/api/v1/categories`, () => HttpResponse.json([])),
    http.get(`${API_BASE}/api/v1/purchases`, () =>
      HttpResponse.json({ data: [], meta: { limit: 20, nextCursor: null, hasMore: false } }),
    ),
  ]
}

const PARSED_ROWS = [
  { line: 2, purchaseDate: '2026-10-04', description: 'Uber', amount: 8997 },
  { line: 3, purchaseDate: '2026-10-03', description: 'Oxxo', amount: 4450 },
  {
    line: 4,
    purchaseDate: '2026-10-02',
    description: 'Comision anual',
    error: 'No es un cargo (monto cero o negativo).',
  },
]

/** Abre el dialogo y sube un archivo simulado con PARSED_ROWS. */
async function openImportDialog() {
  const user = userEvent.setup()
  renderApp(['/compras'])
  await user.click(await screen.findByRole('button', { name: 'Importar Excel' }))
  readMock.mockResolvedValueOnce({ rows: PARSED_ROWS, error: null })
  await user.upload(
    screen.getByLabelText('Archivo Excel'),
    new File(['x'], 'compras.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  )
  await screen.findByTestId('import-preview')
  return user
}

describe('importar compras desde Excel', () => {
  beforeEach(() => {
    readMock.mockReset()
  })

  it('desmarca duplicados y cortes pagados, y bloquea filas ilegibles', async () => {
    server.use(...baseHandlers())
    server.use(
      http.post(`${API_BASE}/api/v1/purchases/import/preview`, () =>
        HttpResponse.json({
          data: [
            { index: 0, duplicateOfId: 'pur-9', statementPaid: false, dateIssue: null },
            { index: 1, duplicateOfId: null, statementPaid: true, dateIssue: null },
          ],
        }),
      ),
    )

    await openImportDialog()

    expect(await screen.findByText(/Posible duplicado/)).toBeVisible()
    expect(screen.getByText(/Corte pagado/)).toBeVisible()
    expect(screen.getByText(/No es un cargo/)).toBeVisible()

    expect(screen.getByLabelText('Incluir Uber')).not.toBeChecked()
    expect(screen.getByLabelText('Incluir Oxxo')).not.toBeChecked()
    expect(screen.getByLabelText('Incluir Comision anual')).toBeDisabled()
    expect(screen.getByText('0 compras · total $0.00')).toBeVisible()
  })

  it('importa solo las filas marcadas, con su total', async () => {
    let importedBody: { creditCardId: string; rows: unknown[] } | null = null
    server.use(...baseHandlers())
    server.use(
      http.post(`${API_BASE}/api/v1/purchases/import/preview`, () =>
        HttpResponse.json({
          data: [
            { index: 0, duplicateOfId: null, statementPaid: false, dateIssue: null },
            { index: 1, duplicateOfId: null, statementPaid: false, dateIssue: null },
          ],
        }),
      ),
      http.post(`${API_BASE}/api/v1/purchases/import`, async ({ request }) => {
        importedBody = (await request.json()) as { creditCardId: string; rows: unknown[] }
        return HttpResponse.json({ createdCount: 1, purchaseIds: ['pur-new'] }, { status: 201 })
      }),
    )

    const user = await openImportDialog()

    await user.click(await screen.findByRole('button', { name: 'Marcar todas' }))
    await user.click(screen.getByLabelText('Incluir Oxxo'))
    expect(screen.getByText('1 compra · total $89.97')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Importar 1 compra' }))

    await waitFor(() => expect(importedBody).not.toBeNull())
    expect(importedBody).toEqual({
      creditCardId: 'card-1',
      rows: [{ purchaseDate: '2026-10-04', description: 'Uber', amount: 8997 }],
    })
  })

  it('muestra el error de la API con su motivo', async () => {
    server.use(...baseHandlers())
    server.use(
      http.post(`${API_BASE}/api/v1/purchases/import/preview`, () =>
        HttpResponse.json({
          data: [
            { index: 0, duplicateOfId: null, statementPaid: false, dateIssue: null },
            { index: 1, duplicateOfId: null, statementPaid: false, dateIssue: null },
          ],
        }),
      ),
      http.post(`${API_BASE}/api/v1/purchases/import`, () =>
        HttpResponse.json(
          {
            type: 'about:blank',
            status: 422,
            detail: 'No se pueden registrar movimientos con fecha futura.',
            reason: 'FUTURE_DATE_NOT_ALLOWED',
            rowIndex: 1,
          },
          { status: 422, headers: { 'content-type': 'application/problem+json' } },
        ),
      ),
    )

    const user = await openImportDialog()
    await user.click(await screen.findByRole('button', { name: 'Marcar todas' }))
    await user.click(screen.getByRole('button', { name: 'Importar 2 compras' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/fecha futura/)
  })
})
