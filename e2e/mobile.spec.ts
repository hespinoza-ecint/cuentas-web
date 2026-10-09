/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { uniqueEmail, verifyUserEmail } from './helpers.ts'

test.describe.configure({ mode: 'serial' })

/** Falla si la página desborda horizontalmente (el clásico scroll lateral). */
async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, 'la página no debe hacer scroll horizontal').toBeLessThanOrEqual(1)
}

test('flujo móvil: navegación, acciones rápidas y diálogos utilizables', async ({ page }) => {
  const email = uniqueEmail('mobile')

  // Registro, verificación y login (igual que en escritorio).
  await page.goto('/registro')
  await page.getByLabel('Nombre').fill('Móvil')
  await page.getByLabel('Apellido').fill('Pruebas')
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
  await expect(page.getByText('Hola, Móvil')).toBeVisible()

  // Modo oscuro: se activa, se recuerda tras recargar y se puede volver a claro.
  await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.getByText('Hola, Móvil')).toBeVisible()
  await page.getByRole('button', { name: 'Cambiar a modo claro' }).click()
  await expect(page.locator('html')).not.toHaveClass(/dark/)

  // Barra inferior: módulos fijos, botón "+" central y "Más".
  const tabBar = page.getByRole('navigation', { name: 'Navegación inferior' })
  await expect(tabBar).toBeVisible()
  for (const label of ['Inicio', 'Movimientos', 'Tarjetas', 'Más']) {
    await expect(tabBar.getByText(label, { exact: true })).toBeVisible()
  }
  await expect(tabBar.getByRole('button', { name: 'Acciones rápidas' })).toBeVisible()
  await expectNoHorizontalScroll(page)

  // Pestañas del módulo: Movimientos → Cuentas.
  await tabBar.getByRole('link', { name: 'Movimientos' }).click()
  const movementsTabs = page.getByRole('navigation', { name: 'Secciones de Movimientos' })
  await movementsTabs.getByRole('link', { name: 'Cuentas' }).click()
  await expect(page).toHaveURL(/\/cuentas$/)

  // Diálogo de cuenta: el botón principal queda a la vista (pie fijo).
  await page.getByRole('button', { name: 'Nueva cuenta' }).first().click()
  const accountDialog = page.getByRole('dialog', { name: 'Nueva cuenta' })
  await accountDialog.getByLabel('Nombre').fill('Cuenta móvil')
  await accountDialog.getByLabel('Saldo inicial (opcional)').fill('500')
  const createAccount = accountDialog.getByRole('button', { name: 'Crear cuenta' })
  await expect(createAccount).toBeInViewport()
  await createAccount.click()
  await expect(page.getByText('Cuenta creada.')).toBeVisible()
  await expect(page.getByText('$500.00').first()).toBeVisible()
  await expectNoHorizontalScroll(page)

  // Acciones rápidas "+": registra un gasto sin salir de la pantalla.
  await page.getByRole('button', { name: 'Acciones rápidas' }).click()
  await page.getByRole('dialog', { name: 'Registrar' }).getByRole('button', { name: /Gasto/ }).click()
  const expenseDialog = page.getByRole('dialog', { name: 'Registrar gasto' })
  await expenseDialog.getByLabel('Descripción').fill('Café móvil')
  await expenseDialog.getByLabel('Monto').fill('45')
  const saveExpense = expenseDialog.getByRole('button', { name: 'Registrar gasto' })
  await expect(saveExpense).toBeInViewport()
  await saveExpense.click()
  await expect(expenseDialog).toBeHidden()
  await expect(page.getByText('Gasto registrado.')).toBeVisible()

  // Pestañas del módulo: Tarjetas → Compras. Sin tarjetas, la compra rápida invita a crearlas.
  await tabBar.getByRole('link', { name: 'Tarjetas' }).click()
  const cardsTabs = page.getByRole('navigation', { name: 'Secciones de Tarjetas' })
  await cardsTabs.getByRole('link', { name: 'Compras' }).click()
  await expect(page).toHaveURL(/\/compras$/)
  await expectNoHorizontalScroll(page)

  await page.getByRole('button', { name: 'Acciones rápidas' }).click()
  await page
    .getByRole('dialog', { name: 'Registrar' })
    .getByRole('button', { name: /Compra con tarjeta/ })
    .click()
  const notice = page.getByRole('dialog', { name: 'Registrar compra' })
  await expect(notice.getByText(/Primero registra una tarjeta/)).toBeVisible()
  await expect(notice.getByRole('link', { name: 'Ir a Tarjetas' })).toBeVisible()
})
