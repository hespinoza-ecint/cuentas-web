import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { uniqueEmail, verifyUserEmail } from './helpers.ts'

const fixture = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures/compras-ejemplo.xlsx',
)

test('importa un estado de cuenta desde Excel con revision paso a paso', async ({ page }) => {
  const email = uniqueEmail('import')

  // Registro, verificacion y login.
  await page.goto('/registro')
  await page.getByLabel('Nombre').fill('E2E')
  await page.getByLabel('Apellido').fill('Import')
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill('Password1234')
  await page.getByLabel('Confirmar contraseña').fill('Password1234')
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(page.getByText(/Te enviamos un correo/)).toBeVisible()
  verifyUserEmail(email)
  await page.goto('/login')
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill('Password1234')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page.getByText('Hola, E2E')).toBeVisible()

  // Tarjeta.
  const nav = page.locator('nav[aria-label="Principal"]')
  await nav.getByRole('link', { name: 'Tarjetas' }).click()
  await page.getByRole('button', { name: 'Nueva tarjeta' }).first().click()
  const cardDialog = page.getByRole('dialog')
  await cardDialog.getByLabel('Alias').fill('Import Oro')
  await cardDialog.getByLabel('Institución').fill('Banco Import')
  await cardDialog.getByLabel('Últimos 4 dígitos').fill('7777')
  await cardDialog.getByLabel('Límite de crédito').fill('20000')
  await cardDialog.getByRole('button', { name: 'Crear tarjeta' }).click()
  await expect(page.getByText(/Import Oro/).first()).toBeVisible()

  // Importacion: archivo, vista previa y revision paso a paso.
  await nav.getByRole('link', { name: 'Compras' }).click()
  await page.getByRole('button', { name: 'Importar Excel' }).click()
  const dialog = page.getByRole('dialog', { name: 'Importar compras desde Excel' })
  await dialog.getByLabel('Archivo Excel').setInputFiles(fixture)
  await expect(dialog.getByText('UBER *TRIP 8005928996 CA')).toBeVisible()
  await expect(dialog.getByText(/No es un cargo/)).toBeVisible()

  await dialog.getByRole('button', { name: 'Revisar una por una' }).click()
  await dialog.getByLabel('Descripción').fill('Uber E2E')
  await dialog.getByRole('button', { name: 'Incluir' }).click()
  await expect(dialog.getByText(/Compra 2 de 2/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Omitir' }).click()
  await expect(dialog.getByText('1 compra · total $89.97')).toBeVisible()

  await dialog.getByRole('button', { name: 'Importar 1 compra' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('Uber E2E')).toBeVisible()
  await expect(page.getByText('OXXO NENEN SUR CCO 8605231N4')).toBeHidden()
})
