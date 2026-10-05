import { expect, test } from '@playwright/test'
import { uniqueEmail, verifyUserEmail } from './helpers.ts'

test.describe.configure({ mode: 'serial' })

test('rechaza credenciales inválidas', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Correo').fill('nadie@test.local')
  await page.getByLabel('Contraseña', { exact: true }).fill('Password1234')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()

  await expect(page.getByRole('alert')).toContainText(/Credenciales invalidas/)
})

test('flujo completo: registro, verificación, finanzas y recomendación', async ({ page }) => {
  const email = uniqueEmail('e2e')
  const firstName = 'QA'

  // Registro
  await page.goto('/registro')
  await page.getByLabel('Nombre').fill(firstName)
  await page.getByLabel('Apellido').fill('Automático')
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill('Password1234')
  await page.getByLabel('Confirmar contraseña').fill('Password1234')
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(page.getByText(/Te enviamos un correo/)).toBeVisible()

  // El enlace de verificación llega al log del backend; en E2E se marca en la BD.
  verifyUserEmail(email)

  // Login
  await page.goto('/login')
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill('Password1234')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page.getByText(`Hola, ${firstName}`)).toBeVisible()

  const nav = page.locator('nav[aria-label="Principal"]')
  const dialog = page.getByRole('dialog')

  // Cuenta de efectivo con saldo inicial
  await nav.getByRole('link', { name: 'Cuentas' }).click()
  await page.getByRole('button', { name: 'Nueva cuenta' }).first().click()
  await dialog.getByLabel('Nombre').fill('QA Efectivo')
  await dialog.getByLabel('Saldo inicial (opcional)').fill('1000')
  await dialog.getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(page.getByText('$1,000.00').first()).toBeVisible()

  // Tarjeta de crédito
  await nav.getByRole('link', { name: 'Tarjetas' }).click()
  await page.getByRole('button', { name: 'Nueva tarjeta' }).first().click()
  await dialog.getByLabel('Alias').fill('QA Oro')
  await dialog.getByLabel('Institución').fill('Banco QA')
  await dialog.getByLabel('Últimos 4 dígitos').fill('9999')
  await dialog.getByLabel('Límite de crédito').fill('20000')
  await dialog.getByRole('button', { name: 'Crear tarjeta' }).click()
  await expect(page.getByText(/QA Oro/).first()).toBeVisible()

  // Compra a meses sin intereses
  await nav.getByRole('link', { name: 'Compras' }).click()
  await page.getByRole('button', { name: 'Registrar compra' }).click()
  await dialog.getByLabel('Descripción').fill('Compra E2E')
  await dialog.getByLabel('Monto').fill('1500')
  await dialog.getByLabel('Tipo').selectOption('MSI')
  await dialog.getByRole('button', { name: 'Registrar compra' }).click()
  await expect(page.getByText('Compra E2E')).toBeVisible()
  await expect(page.getByText(/próxima #1/)).toBeVisible()

  // Recomendación para una compra nueva
  await nav.getByRole('link', { name: 'Recomendador' }).click()
  await page.getByLabel('Monto de la compra').fill('500')
  await page.getByRole('button', { name: 'Recomendar' }).click()
  await expect(page.getByTestId('recommendation-result')).toBeVisible()
  await expect(page.getByText(/no constituye asesoria financiera/)).toBeVisible()

  // Cierre de sesión
  await page.getByRole('button', { name: new RegExp(firstName) }).click()
  await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click()
  await expect(page.getByText('Inicia sesión para continuar')).toBeVisible()
})
