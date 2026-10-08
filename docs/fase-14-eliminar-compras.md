# Fase 14 — Eliminar compras con mensualidades (frontend)

## 1. Objetivo

Dar en la pantalla de **Compras** una acción **Eliminar** para cualquier compra
—regular, MSI o diferida—, incluidas las que ya tienen mensualidades pagadas o
están liquidadas, explicando el ajuste y avisando el resultado. La regla del
backend está en `cuentas-api/docs/fase-14-eliminar-compras-con-plan.md` (RN-27).

## 2. Qué cambió

| Pieza | Descripción |
|---|---|
| Botón **Eliminar** | Disponible en **todas** las compras (en rojo suave para distinguirlo); "Cancelar" se mantiene donde aplica (activas sin pagos), para quien prefiera dejar el registro como cancelado |
| Diálogo de motivo | `ReasonDialog` con el detalle del ajuste según el tipo: en MSI muestra el monto exacto pendiente; en regulares avisa que se revierte "hasta donde alcance la deuda actual" (los pagos cubren cortes completos, no compras individuales); en canceladas aclara que no hay nada que revertir |
| Aviso de éxito | "Compra eliminada: se descontaron $X del saldo de la tarjeta." (o "no quedaba saldo pendiente") |
| Detalle de la compra | Mismo botón **Eliminar compra** cuando corresponde; cierra el detalle y abre la confirmación |
| Cachés | Se invalidan compras, tarjetas, estados de cuenta y dashboard tras eliminar |

`purchases-api.ts` agrega `deletePurchase(id, reason)` (`DELETE /api/v1/purchases/{id}`)
y el tipo `DeletePurchaseResult` (`refundedPrincipal`, `paidAmount`).
Tipos regenerados con `npm.cmd run api:types` desde el OpenAPI del backend.

## 3. Pruebas

```powershell
npx.cmd vitest run src/features/purchases/purchases.test.tsx   # 7 pruebas
```

- elimina una compra MSI con mensualidades pagadas: el diálogo muestra el ajuste
  ($600.00), envía el motivo y aparece el aviso con el monto revertido;
- elimina una compra regular: el diálogo avisa del tope por deuda actual y el
  aviso reporta lo descontado;
- una compra sin pagos muestra **Cancelar y Eliminar** a la vez.

Verificación completa de la fase:

```powershell
npm.cmd run typecheck   # limpio
npm.cmd run lint        # limpio
npm.cmd run test        # suite completa
npm.cmd run build       # OK
npm.cmd run test:e2e    # flujo escritorio + móvil
```

## 4. Despliegue

Solo frontend (el backend requiere su propio despliegue con la ruta nueva):

```bash
docker compose build web && docker compose up -d web
```
