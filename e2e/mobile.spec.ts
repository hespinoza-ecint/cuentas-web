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

  // Barra inferior con las pestañas fijas y el botón "Más".
  const tabBar = page.getByRole('navigation', { name: 'Navegación inferior' })
  await expect(tabBar).toBeVisible()
  for (const label of ['Inicio', 'Compras', 'Tarjetas', 'Recomendador', 'Más']) {
    await expect(tabBar.getByText(label, { exact: true })).toBeVisible()
  }
  await expectNoHorizontalScroll(page)

  // La hoja "Más" navega a secciones que no están en la barra.
  await page.getByRole('button', { name: 'Más' }).click()
  const moreSheet = page.getByRole('dialog', { name: 'Más secciones' })
  await moreSheet.getByRole('link', { name: 'Cuentas' }).click()

  // Diálogo de cuenta: el botón principal queda a la vista (pie fijo).
  await page.getByRole('button', { name: 'Nueva cuenta' }).first().click()
  const accountDialog = page.getByRole('dialog', { name: 'Nueva cuenta' })
  await accountDialog.getByLabel('Nombre').fill('Cuenta móvil')
  await accountDialog.getByLabel('Saldo inicial (opcional)').fill('500')
  const createAccount = accountDialog.getByRole('button', { name: 'Crear cuenta' })
  await expect(createAccount).toBeInViewport()
  await createAccount.click()
  await expect(page.getByText('$500.00').first()).toBeVisible()
  await expectNoHorizontalScroll(page)

  // Acciones rápidas "＋": registra un gasto sin salir de la pantalla.
  await page.getByRole('button', { name: 'Acciones rápidas' }).click()
  await page.getByRole('dialog', { name: 'Registrar' }).getByRole('button', { name: /Gasto/ }).click()
  const expenseDialog = page.getByRole('dialog', { name: 'Registrar gasto' })
  await expenseDialog.getByLabel('Descripción').fill('Café móvil')
  await expenseDialog.getByLabel('Monto').fill('45')
  const saveExpense = expenseDialog.getByRole('button', { name: 'Registrar gasto' })
  await expect(saveExpense).toBeInViewport()
  await saveExpense.click()
  await expect(expenseDialog).toBeHidden()

  // Pestaña fija "Compras" y, sin tarjetas, la compra rápida invita a crearlas.
  await tabBar.getByRole('link', { name: 'Compras' }).click()
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
