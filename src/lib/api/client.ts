import createClient from 'openapi-fetch'
import type { paths } from './schema'

/**
 * Cliente HTTP tipado a partir de la especificacion OpenAPI del backend.
 *
 * `baseUrl: ''` usa el mismo origen: en desarrollo Vite reenvia `/api` y
 * `/health` a http://localhost:3000 (ver vite.config.ts); en produccion nginx
 * sirve el frontend y la API bajo el mismo dominio.
 */
export const api = createClient<paths>({ baseUrl: '' })
