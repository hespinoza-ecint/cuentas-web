import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

export const API_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../cuentas-api',
)

/** Base de datos MySQL reservada para pruebas. Nunca uses otra. */
export const TEST_DATABASE_NAME = 'Cuentas_Test'

function readApiEnv(name: string): string | undefined {
  const envPath = path.join(API_DIR, '.env')
  if (!existsSync(envPath)) {
    return undefined
  }

  const match = readFileSync(envPath, 'utf8').match(
    new RegExp(`^\\s*${name}\\s*=\\s*(.+)$`, 'm'),
  )
  return match?.[1].trim()
}

/**
 * URL de la base E2E: se deriva de `cuentas-api/.env` cambiando el nombre de
 * la base. TEST_DATABASE_URL permite sobreescribirla.
 */
function buildE2eDatabaseUrl(): string {
  const source = process.env.TEST_DATABASE_URL ?? readApiEnv('DATABASE_URL')
  if (!source) {
    throw new Error('Falta DATABASE_URL en cuentas-api/.env para derivar la base E2E')
  }

  const url = new URL(source)
  if (url.protocol !== 'mysql:') {
    throw new Error(`El E2E requiere MySQL (mysql://...). DATABASE_URL usa: ${url.protocol}`)
  }

  url.pathname = `/${TEST_DATABASE_NAME}`
  url.searchParams.set('connection_limit', process.env.TEST_DB_CONNECTION_LIMIT ?? '5')

  const databaseUrl = url.toString()
  const name = decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//, ''))
  if (name !== TEST_DATABASE_NAME) {
    throw new Error(`El E2E solo puede usar la base ${TEST_DATABASE_NAME} (recibida: ${name})`)
  }

  return databaseUrl
}

export const E2E_DATABASE_URL = buildE2eDatabaseUrl()

export const E2E_JWT_SECRET = 'e2e-secret-with-at-least-32-characters'
