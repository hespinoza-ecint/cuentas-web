import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { getStatus } from '../../lib/auth/session.ts'
import { API_BASE, authResponse, problem, testUser } from '../../test/fixtures.ts'
import { server } from '../../test/msw/server.ts'
import { renderApp } from '../../test/render-app.tsx'

const refreshUnauthorized = http.post(`${API_BASE}/api/v1/auth/refresh`, () =>
  problem(401, {
    title: 'Unauthorized',
    detail: 'La sesión no está activa.',
    code: 'UNAUTHORIZED',
  }),
)

async function submitLogin(email: string, password: string) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Correo'), email)
  await user.type(screen.getByLabelText('Contraseña'), password)
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
}

describe('flujo de autenticación', () => {
  it('inicia sesión y muestra el inicio con el usuario', async () => {
    server.use(
      http.post(`${API_BASE}/api/v1/auth/login`, () => HttpResponse.json(authResponse('tok-1'))),
      refreshUnauthorized,
    )

    renderApp(['/login'])
    await submitLogin('ana@test.local', 'password-1234')

    expect(await screen.findByText('Hola, Ana')).toBeInTheDocument()
    expect(screen.getByText('ana@test.local')).toBeInTheDocument()
    expect(getStatus()).toBe('authenticated')
  })

  it('muestra el error de credenciales inválidas', async () => {
    server.use(
      http.post(`${API_BASE}/api/v1/auth/login`, () =>
        problem(401, {
          title: 'Unauthorized',
          detail: 'El correo o la contraseña son incorrectos.',
          code: 'UNAUTHORIZED',
          reason: 'INVALID_CREDENTIALS',
        }),
      ),
      refreshUnauthorized,
    )

    renderApp(['/login'])
    await submitLogin('ana@test.local', 'otra-password')

    expect(await screen.findByRole('alert')).toHaveTextContent('incorrectos')
  })

  it('muestra el bloqueo temporal de la cuenta (423)', async () => {
    server.use(
      http.post(`${API_BASE}/api/v1/auth/login`, () =>
        problem(423, {
          title: 'Locked',
          detail: 'La cuenta está bloqueada temporalmente. Intenta de nuevo en 15 minutos.',
          code: 'ACCOUNT_LOCKED',
          reason: 'ACCOUNT_LOCKED',
        }),
      ),
      refreshUnauthorized,
    )

    renderApp(['/login'])
    await submitLogin('ana@test.local', 'password-1234')

    expect(await screen.findByRole('alert')).toHaveTextContent('bloqueada')
  })

  it('protege las rutas privadas y redirige al login', async () => {
    server.use(refreshUnauthorized)
    renderApp(['/'])

    expect(await screen.findByText('Inicia sesión para continuar')).toBeInTheDocument()
  })

  it('verifica el correo con el token del enlace', async () => {
    server.use(
      refreshUnauthorized,
      http.post(`${API_BASE}/api/v1/auth/verify-email`, () =>
        HttpResponse.json({ message: 'Correo verificado correctamente.' }),
      ),
    )

    renderApp(['/verificar-correo?token=abc123'])

    expect(await screen.findByText('Correo verificado correctamente.')).toBeInTheDocument()
  })

  it('registra la cuenta y envía a la pantalla de verificación', async () => {
    server.use(
      refreshUnauthorized,
      http.post(`${API_BASE}/api/v1/auth/register`, () =>
        HttpResponse.json(
          { message: 'Cuenta creada.', user: { ...testUser, emailVerified: false, status: 'PENDING_VERIFICATION' } },
          { status: 201 },
        ),
      ),
    )

    renderApp(['/registro'])
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Nombre'), 'Ana')
    await user.type(screen.getByLabelText('Apellido'), 'López')
    await user.type(screen.getByLabelText('Correo'), 'ana@test.local')
    await user.type(screen.getByLabelText('Contraseña'), 'password-1234')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'password-1234')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText(/Te enviamos un correo/)).toBeInTheDocument()
  })

  it('renueva el token y reintenta la petición que recibió 401', async () => {
    let refreshCalls = 0
    let healthCalls = 0

    server.use(
      http.post(`${API_BASE}/api/v1/auth/login`, () => HttpResponse.json(authResponse('tok-1'))),
      http.post(`${API_BASE}/api/v1/auth/refresh`, () => {
        refreshCalls += 1
        if (refreshCalls === 1) {
          // El intento inicial (bootstrap) no tiene sesión.
          return problem(401, { title: 'Unauthorized', detail: 'Sin sesión.', code: 'UNAUTHORIZED' })
        }
        return HttpResponse.json(authResponse('tok-2'))
      }),
      http.get(`${API_BASE}/health`, ({ request }) => {
        healthCalls += 1
        if (request.headers.get('authorization') === 'Bearer tok-1') {
          return problem(401, { title: 'Unauthorized', detail: 'Token expirado.', code: 'UNAUTHORIZED' })
        }
        return HttpResponse.json({
          status: 'ok',
          version: '0.1.0',
          environment: 'test',
          uptimeSeconds: 1,
          timestamp: new Date().toISOString(),
          checks: { database: { status: 'up', latencyMs: 1 } },
        })
      }),
    )

    renderApp(['/login'])
    await submitLogin('ana@test.local', 'password-1234')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('link', { name: 'Estado del backend' }))

    await waitFor(() => {
      expect(healthCalls).toBe(2)
    })
    expect(refreshCalls).toBe(2)
    expect(getStatus()).toBe('authenticated')
    expect(await screen.findByTestId('health-result')).toHaveTextContent('up')
  })
})
