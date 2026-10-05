import { fileURLToPath } from 'node:url'
import path from 'node:path'

const localAppData = process.env.LOCALAPPDATA ?? 'C:/Users/Public/AppData/Local'

/** Base de datos aislada para E2E (fuera de OneDrive, como la de desarrollo). */
export const E2E_DATABASE_URL = `file:${localAppData.replace(/\\/g, '/')}/Cuentas/data/cuentas-e2e.db`

export const E2E_JWT_SECRET = 'e2e-secret-with-at-least-32-characters'

export const API_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../cuentas-api',
)
