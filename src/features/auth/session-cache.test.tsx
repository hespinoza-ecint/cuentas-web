import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  API_BASE,
  emptyDashboardHandlers,
  refreshOk,
  settingsHandler,
} from '../../test/fixtures.ts'
import { server } from '../../test/msw/server.ts'
import { renderApp } from '../../test/render-app.tsx'

const logoutOk = http.post(
  `${API_BASE}/api/v1/auth/logout`,
  () => new HttpResponse(null, { status: 204 }),
)

describe('limpieza de cache al terminar la sesión', () => {
  beforeEach(() => {
    vi.stubGlobal('caches', { delete: vi.fn().mockResolvedValue(true) })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('al cerrar sesión vacía la cache de datos y la del service worker', async () => {
    server.use(refreshOk, settingsHandler, ...emptyDashboardHandlers, logoutOk)
    const { queryClient } = renderApp(['/'])

    const user = userEvent.setup()
    await screen.findByText('Hola, Ana')
    expect(queryClient.getQueryCache().getAll().length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Más' }))
    const sheet = await screen.findByRole('dialog')
    await user.click(within(sheet).getByRole('button', { name: 'Cerrar sesión' }))

    await waitFor(() => {
      expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    })
    expect(caches.delete).toHaveBeenCalledWith('cuentas-api-read')
  })
})
