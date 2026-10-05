import { execSync } from 'node:child_process'
import { API_DIR, E2E_DATABASE_URL } from './config.ts'

export function uniqueEmail(prefix = 'e2e'): string {
  const stamp = Date.now()
  const random = Math.floor(Math.random() * 10_000)
  return `${prefix}-${stamp}-${random}@test.local`
}

/**
 * Verifica el correo directamente en la base de datos de E2E (el enlace real
 * llega al log del backend, que no es accesible desde el navegador).
 */
export function verifyUserEmail(email: string): void {
  execSync(`node scripts/verify-email.mjs ${email}`, {
    cwd: API_DIR,
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
    stdio: 'pipe',
  })
}
