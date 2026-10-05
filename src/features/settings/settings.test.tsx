import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { API_BASE, refreshOk } from '../../test/fixtures.ts'
import { server } from '../../test/msw/server.ts'
import { renderApp } from '../../test/render-app.tsx'

const settings = {
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

describe('configuración', () => {
  it('carga los valores y guarda montos en centavos y tasas en puntos base', async () => {
    let patched: Record<string, unknown> | null = null

    server.use(
      refreshOk,
      http.get(`${API_BASE}/api/v1/users/me/settings`, () => HttpResponse.json(settings)),
      http.patch(`${API_BASE}/api/v1/users/me/settings`, async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...settings, minCashBuffer: 200000 })
      }),
    )

    renderApp(['/configuracion'])
    const user = userEvent.setup()

    const buffer = await screen.findByLabelText('Colchón mínimo de efectivo')
    await user.clear(buffer)
    await user.type(buffer, '2000')
    await user.click(screen.getByRole('button', { name: 'Guardar configuración' }))

    expect(await screen.findByText('Configuración guardada.')).toBeInTheDocument()
    expect(patched?.minCashBuffer).toBe(200000)
    expect(patched?.maxUtilizationBps).toBe(3000)
    expect(patched?.variableIncomeFactorBps).toBe(9000)
    expect(patched?.projectionMinDays).toBe(60)
  })

  it('valida los porcentajes fuera de rango', async () => {
    server.use(
      refreshOk,
      http.get(`${API_BASE}/api/v1/users/me/settings`, () => HttpResponse.json(settings)),
    )

    renderApp(['/configuracion'])
    const user = userEvent.setup()

    const utilization = await screen.findByLabelText('Utilización máxima de crédito (%)')
    await user.clear(utilization)
    await user.type(utilization, '150')
    await user.click(screen.getByRole('button', { name: 'Guardar configuración' }))

    expect(await screen.findByText('Debe estar entre 0 y 100')).toBeInTheDocument()
  })
})
