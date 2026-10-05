import createClient, { type Middleware } from 'openapi-fetch'
import type { paths } from './schema.ts'
import {
  configureSessionRefresh,
  getAccessToken,
  refreshSession,
  type AuthSession,
} from '../auth/session.ts'

/**
 * Cliente HTTP tipado a partir de la especificacion OpenAPI del backend.
 *
 * `baseUrl: ''` usa el mismo origen: en desarrollo Vite reenvia `/api` y
 * `/health` a http://localhost:3000 (ver vite.config.ts); en produccion nginx
 * sirve el frontend y la API bajo el mismo dominio. En pruebas se usa un
 * origen absoluto para que MSW pueda interceptar.
 */
const baseUrl = import.meta.env.MODE === 'test' ? 'http://cuentas.test' : ''

/**
 * `openapi-fetch` captura `globalThis.fetch` al crear el cliente; las pruebas
 * lo parchean después (MSW), así que se resuelve en cada llamada.
 */
const deferredFetch = (input: Request): Promise<Response> => globalThis.fetch(input)

/** Cliente sin middleware: se usa para renovar la sesión (evita recursión). */
export const rawApi = createClient<paths>({
  baseUrl,
  credentials: 'include',
  fetch: deferredFetch,
})

configureSessionRefresh(async (): Promise<AuthSession | null> => {
  // En web el refresh viaja en la cookie httpOnly; el cuerpo va vacío.
  const { data, error } = await rawApi.POST('/api/v1/auth/refresh', { body: {} })
  if (error || !data) {
    return null
  }
  return { accessToken: data.accessToken, user: data.user }
})

/** Cuerpos de petición guardados para poder reintentar tras renovar el token. */
const retryBodies = new WeakMap<Request, ArrayBuffer>()

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      retryBodies.set(request, await request.clone().arrayBuffer())
    }
    const token = getAccessToken()
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`)
    }
    return request
  },

  async onResponse({ request, response }) {
    if (response.status !== 401) {
      return response
    }

    const path = new URL(request.url, 'http://localhost').pathname
    // En los endpoints de sesión el 401 es la respuesta legítima.
    if (
      path.endsWith('/auth/refresh') ||
      path.endsWith('/auth/login') ||
      path.endsWith('/auth/logout')
    ) {
      return response
    }

    const refreshed = await refreshSession()
    if (!refreshed) {
      return response
    }

    const headers = new Headers(request.headers)
    headers.set('Authorization', `Bearer ${getAccessToken() ?? ''}`)
    const body = retryBodies.get(request)

    return fetch(request.url, {
      method: request.method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
      credentials: 'include',
    })
  },
}

/** Cliente de la aplicación: adjunta el token y reintenta una vez tras renovarlo. */
export const api = createClient<paths>({
  baseUrl,
  credentials: 'include',
  fetch: deferredFetch,
})
api.use(authMiddleware)
