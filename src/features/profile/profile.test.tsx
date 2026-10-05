import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { API_BASE, refreshOk, testUser } from '../../test/fixtures.ts'
import { server } from '../../test/msw/server.ts'
import { renderApp } from '../../test/render-app.tsx'

describe('perfil', () => {
  it('actualiza los datos y los refleja en la cabecera', async () => {
    let patched: Record<string, unknown> | null = null

    server.use(
      refreshOk,
      http.patch(`${API_BASE}/api/v1/users/me`, async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...testUser, firstName: 'Ana María' })
      }),
    )

    renderApp(['/perfil'])
    const user = userEvent.setup()

    const nameInput = await screen.findByLabelText('Nombre')
    await user.clear(nameInput)
    await user.type(nameInput, 'Ana María')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Datos actualizados.')).toBeInTheDocument()
    expect(patched?.firstName).toBe('Ana María')
    expect(await screen.findByText('Ana María')).toBeInTheDocument()
  })

  it('cambia la contraseña y muestra el mensaje del backend', async () => {
    server.use(
      refreshOk,
      http.post(`${API_BASE}/api/v1/users/me/change-password`, () =>
        HttpResponse.json({ message: 'Contrasena actualizada. Se cerraron las demas sesiones.' }),
      ),
    )

    renderApp(['/perfil'])
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Contraseña actual'), 'Password1234')
    await user.type(screen.getByLabelText('Nueva contraseña'), 'NuevaPassword123')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'NuevaPassword123')
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    expect(await screen.findByText(/Se cerraron las demas sesiones/)).toBeInTheDocument()
  })
})
