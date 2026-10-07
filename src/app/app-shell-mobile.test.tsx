import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { setThemePreference } from '../lib/theme.ts'
import { API_BASE, emptyDashboardHandlers, refreshOk, settingsHandler } from '../test/fixtures.ts'
import { server } from '../test/msw/server.ts'
import { renderApp } from '../test/render-app.tsx'

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

describe('navegación móvil', () => {
  it('la hoja "Más" reúne el resto de secciones y el cierre de sesión', async () => {
    server.use(refreshOk, settingsHandler, ...emptyDashboardHandlers)
    renderApp(['/'])

    const user = userEvent.setup()
    await screen.findByText('Hola, Ana')

    await user.click(screen.getByRole('button', { name: 'Más' }))
    const sheet = await screen.findByRole('dialog')

    expect(within(sheet).getByText('Más secciones')).toBeInTheDocument()
    expect(within(sheet).getByRole('link', { name: 'Movimientos' })).toBeInTheDocument()
    expect(within(sheet).getByRole('link', { name: 'Configuración' })).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: 'Claro' })).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: 'Oscuro' })).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: 'Sistema' })).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument()
  })

  it('el botón de tema alterna el modo oscuro y lo recuerda', async () => {
    server.use(refreshOk, settingsHandler, ...emptyDashboardHandlers)
    renderApp(['/'])

    const user = userEvent.setup()
    await screen.findByText('Hola, Ana')

    await user.click(screen.getByRole('button', { name: 'Cambiar a modo oscuro' }))
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('cuentas.theme')).toBe('dark')

    await user.click(screen.getByRole('button', { name: 'Cambiar a modo claro' }))
    expect(document.documentElement).not.toHaveClass('dark')

    setThemePreference('system')
    localStorage.removeItem('cuentas.theme')
  })

  it('la barra inferior muestra las 4 pestañas fijas y "Más"', async () => {
    server.use(refreshOk, settingsHandler, ...emptyDashboardHandlers)
    renderApp(['/'])

    await screen.findByText('Hola, Ana')
    const tabBar = screen.getByRole('navigation', { name: 'Navegación inferior' })

    for (const label of ['Inicio', 'Compras', 'Tarjetas', 'Recomendador', 'Más']) {
      expect(within(tabBar).getByText(label)).toBeInTheDocument()
    }
  })

  it('las acciones rápidas registran un gasto sin salir del inicio', async () => {
    server.use(
      refreshOk,
      settingsHandler,
      ...emptyDashboardHandlers,
      http.get(`${API_BASE}/api/v1/cash-accounts`, () => HttpResponse.json([account])),
      http.get(`${API_BASE}/api/v1/categories`, () => HttpResponse.json([category])),
    )
    renderApp(['/'])

    const user = userEvent.setup()
    await screen.findByText('Hola, Ana')

    await user.click(screen.getByRole('button', { name: 'Acciones rápidas' }))
    const sheet = await screen.findByRole('dialog')
    await user.click(within(sheet).getByRole('button', { name: /Gasto/ }))

    // El formulario de gasto reutilizado se abre sobre el inicio.
    const form = await screen.findByRole('dialog', { name: 'Registrar gasto' })
    expect(within(form).getByLabelText('Descripción')).toBeInTheDocument()
    expect(within(form).getByLabelText('Monto')).toBeInTheDocument()
  })

  it('sin tarjetas, la compra rápida invita a registrar una', async () => {
    server.use(
      refreshOk,
      settingsHandler,
      ...emptyDashboardHandlers,
      http.get(`${API_BASE}/api/v1/cards`, () => HttpResponse.json([])),
      http.get(`${API_BASE}/api/v1/categories`, () => HttpResponse.json([category])),
    )
    renderApp(['/'])

    const user = userEvent.setup()
    await screen.findByText('Hola, Ana')

    await user.click(screen.getByRole('button', { name: 'Acciones rápidas' }))
    const sheet = await screen.findByRole('dialog')
    await user.click(within(sheet).getByRole('button', { name: /Compra con tarjeta/ }))

    expect(await screen.findByText(/Primero registra una tarjeta/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a Tarjetas' })).toBeInTheDocument()
  })
})
