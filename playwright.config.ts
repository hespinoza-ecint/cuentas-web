import { defineConfig, devices } from '@playwright/test'
import { API_DIR, E2E_DATABASE_URL, E2E_JWT_SECRET } from './e2e/config.ts'

/**
 * E2E contra el backend real y una base SQLite exclusiva de pruebas.
 *
 * Antes de correr: `npx playwright install chromium` (una sola vez).
 * Los servidores se levantan solos; si ya tienes uno en los puertos 3000 o
 * 5173, deténlo antes.
 *
 * Proyectos:
 *  - desktop: flujo completo (full-flow.spec.ts)
 *  - mobile:  viewport Pixel 7 (mobile.spec.ts)
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      testMatch: /mobile\.spec\.ts/,
    },
  ],
  webServer: [
    {
      // Backend en modo producción (dist) con base E2E y throttle relajado.
      // El build se hace con `npm run test:e2e` (pretest) o si falta dist.
      command: 'node scripts/e2e-server.mjs',
      cwd: API_DIR,
      url: 'http://127.0.0.1:3000/health',
      reuseExistingServer: false,
      timeout: 300_000,
      env: {
        DATABASE_URL: E2E_DATABASE_URL,
        JWT_SECRET: E2E_JWT_SECRET,
        AUTH_THROTTLE_LIMIT: '1000',
        LOG_LEVEL: 'error',
        DOCS_ENABLED: 'false',
      },
    },
    {
      command: 'npm.cmd run dev -- --strictPort',
      cwd: '.',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
      timeout: 240_000,
    },
  ],
})
