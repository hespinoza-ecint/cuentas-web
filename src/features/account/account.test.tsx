import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE, refreshOk, settingsHandler, testUser } from '../../test/fixtures.ts'
import { server } from '../../test/msw/server.ts'
import { renderApp } from '../../test/render-app.tsx'

const pendingRefresh = http.post(`${API_BASE}/api/v1/auth/refresh`, () =>
  HttpResponse.json({
    accessToken: 'tok-pending',
    tokenType: 'Bearer',
    expiresInSeconds: 900,
    user: { ...testUser, status: 'PENDING_DELETION' },
  }),
)

describe('cuenta y datos', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:test') as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('descarga la exportación en JSON', async () => {
    let exported = false

    server.use(
      refreshOk,
      settingsHandler,
      http.get(`${API_BASE}/api/v1/users/me/export`, () => {
        exported = true
        return HttpResponse.json(
          { exportedAt: '2026-10-05T00:00:00.000Z', user: { email: testUser.email } },
          { headers: { 'content-disposition': 'attachment; filename="cuentas-export-2026-10-05.json"' } },
        )
      }),
    )

    renderApp(['/cuenta'])
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Descargar exportación' }))

    await waitFor(() => expect(exported).toBe(true))
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(await screen.findByText('Exportación descargada.')).toBeInTheDocument()
  })

  it('programa la eliminación con contraseña y confirmación', async () => {
    let deleted: Record<string, unknown> | null = null

    server.use(
      refreshOk,
      settingsHandler,
      http.post(`${API_BASE}/api/v1/users/me/delete`, async ({ request }) => {
        deleted = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          message: 'La cuenta se eliminara definitivamente en 30 dias. Puedes cancelar antes.',
        })
      }),
    )

    renderApp(['/cuenta'])
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Eliminar mi cuenta' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Contraseña'), 'Password1234')
    await user.click(within(dialog).getByRole('checkbox'))
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar cuenta' }))

    await waitFor(() => expect(deleted).not.toBeNull())
    expect(deleted?.password).toBe('Password1234')
    expect(await screen.findByText('Eliminación programada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ir a iniciar sesión' })).toBeInTheDocument()
  })

  it('permite cancelar la eliminación cuando la cuenta está en proceso', async () => {
    let cancelled = false

    server.use(
      pendingRefresh,
      http.post(`${API_BASE}/api/v1/users/me/cancel-deletion`, () => {
        cancelled = true
        return HttpResponse.json({ message: 'La eliminacion fue cancelada.' })
      }),
    )

    renderApp(['/cuenta'])
    const user = userEvent.setup()

    expect(
      await screen.findByText(/Tu cuenta está en proceso de eliminación/),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar eliminación' }))

    await waitFor(() => expect(cancelled).toBe(true))
    expect(await screen.findByText('La eliminacion fue cancelada.')).toBeInTheDocument()
  })
})
