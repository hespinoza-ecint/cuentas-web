import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { API_BASE, refreshOk, settingsHandler, testUser } from '../../test/fixtures.ts'
import { server } from '../../test/msw/server.ts'
import { renderApp } from '../../test/render-app.tsx'

const adminRefresh = http.post(`${API_BASE}/api/v1/auth/refresh`, () =>
  HttpResponse.json({
    accessToken: 'tok-admin',
    tokenType: 'Bearer',
    expiresInSeconds: 900,
    user: { ...testUser, role: 'ADMIN' },
  }),
)

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
]

describe('administración', () => {
  it('oculta las reglas globales a los usuarios sin rol ADMIN', async () => {
    server.use(refreshOk, settingsHandler)
    renderApp(['/admin/reglas'])

    expect(await screen.findByText('Solo administradores')).toBeInTheDocument()
  })

  it('permite a un ADMIN ajustar una regla global', async () => {
    let patched: { code: string; body: Record<string, unknown> } | null = null

    server.use(
      adminRefresh,
      settingsHandler,
      http.get(`${API_BASE}/api/v1/recommendation-rules`, () => HttpResponse.json(rules)),
      http.patch(`${API_BASE}/api/v1/admin/recommendation-rules/:code`, async ({ request, params }) => {
        patched = { code: params.code as string, body: (await request.json()) as Record<string, unknown> }
        return HttpResponse.json({ ...rules[0], isEnabled: false })
      }),
    )

    renderApp(['/admin/reglas'])
    const user = userEvent.setup()

    const list = await screen.findByTestId('admin-rules-list')
    const rule = within(list).getByText('Flujo de efectivo no negativo').closest('li') as HTMLElement
    await user.click(within(rule).getByRole('checkbox'))

    await waitFor(() => expect(patched).not.toBeNull())
    expect(patched?.code).toBe('CASHFLOW_NON_NEGATIVE')
    expect(patched?.body.isEnabled).toBe(false)
    expect(await screen.findByText(/Regla global actualizada/)).toBeInTheDocument()
  })

  it('ejecuta el mantenimiento y muestra el resultado', async () => {
    let ran = false

    server.use(
      adminRefresh,
      settingsHandler,
      http.post(`${API_BASE}/api/v1/admin/maintenance/run`, () => {
        ran = true
        return HttpResponse.json({
          ranAt: '2026-10-05T09:00:00.000Z',
          sessionsDeleted: 3,
          tokensDeleted: 1,
          idempotencyDeleted: 0,
          usersPurged: 0,
        })
      }),
    )

    renderApp(['/admin/mantenimiento'])
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Ejecutar mantenimiento' }))

    await waitFor(() => expect(ran).toBe(true))
    const result = await screen.findByTestId('maintenance-result')
    expect(within(result).getByText('Sesiones eliminadas')).toBeInTheDocument()
    expect(within(result).getByText('3')).toBeInTheDocument()
  })
})
