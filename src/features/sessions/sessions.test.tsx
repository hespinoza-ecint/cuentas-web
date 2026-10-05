import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { API_BASE, refreshOk } from '../../test/fixtures.ts'
import { server } from '../../test/msw/server.ts'
import { renderApp } from '../../test/render-app.tsx'

const currentSession = {
  id: 's-1',
  clientType: 'WEB',
  deviceName: 'Este dispositivo',
  ip: '127.0.0.1',
  userAgent: 'vitest',
  createdAt: '2026-10-01T10:00:00.000Z',
  lastUsedAt: '2026-10-05T10:00:00.000Z',
  current: true,
}

const otherSession = {
  id: 's-2',
  clientType: 'NATIVE',
  deviceName: 'Laptop',
  ip: '10.0.0.5',
  userAgent: 'expo',
  createdAt: '2026-09-20T10:00:00.000Z',
  lastUsedAt: '2026-10-04T10:00:00.000Z',
  current: false,
}

describe('sesiones activas', () => {
  it('revoca una sesión con confirmación', async () => {
    let getCalls = 0
    let deletedId: string | null = null

    server.use(
      refreshOk,
      http.get(`${API_BASE}/api/v1/auth/sessions`, () => {
        getCalls += 1
        return HttpResponse.json(getCalls === 1 ? [currentSession, otherSession] : [currentSession])
      }),
      http.delete(`${API_BASE}/api/v1/auth/sessions/:id`, ({ params }) => {
        deletedId = params.id as string
        return new HttpResponse(null, { status: 204 })
      }),
    )

    renderApp(['/sesiones'])
    const user = userEvent.setup()

    expect(await screen.findByText('Laptop')).toBeInTheDocument()
    expect(screen.getByText('Este dispositivo')).toBeInTheDocument()
    expect(screen.getByText('Actual')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Revocar' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Revocar' }))

    await waitFor(() => expect(deletedId).toBe('s-2'))
    await waitFor(() => expect(screen.queryByText('Laptop')).not.toBeInTheDocument())
  })
})
