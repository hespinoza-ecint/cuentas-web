import { act, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { emptyDashboardHandlers, refreshOk, settingsHandler } from '../test/fixtures.ts'
import { server } from '../test/msw/server.ts'
import { renderApp } from '../test/render-app.tsx'

describe('modo sin conexión', () => {
  let online = true

  beforeEach(() => {
    online = true
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => online,
    })
  })

  it('avisa cuando el navegador pierde la conexión y oculta el aviso al volver', async () => {
    server.use(refreshOk, settingsHandler, ...emptyDashboardHandlers)
    renderApp(['/'])

    expect(await screen.findByText('Hola, Ana')).toBeInTheDocument()
    expect(screen.queryByText(/Sin conexión/)).not.toBeInTheDocument()

    online = false
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })

    expect(await screen.findByText(/Sin conexión/)).toBeInTheDocument()

    online = true
    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    await waitFor(() => {
      expect(screen.queryByText(/Sin conexión/)).not.toBeInTheDocument()
    })
  })
})
