# Fase 30 — Compras bloqueadas por corte pagado (RN-30)

## 1. Objetivo

Cuando el corte de una compra ya tiene pagos, la API responde 422 a cancelar y
eliminar (RN-30). La web deja de ofrecer esas acciones por adelantado y explica
por qué, en lugar de dejar que el usuario llene un motivo para recibir el error.

- En el listado, la fila deja de mostrar el menú "⋯" cuando la compra está
  bloqueada y agrega la nota bajo los datos de la compra.
- En el detalle, desaparecen "Cancelar compra" y "Eliminar compra" y la nota
  aparece arriba del pie del diálogo.

## 2. Cambios

| Archivo | Cambio |
|---|---|
| `src/features/purchases/purchases-api.ts` | `Purchase.lockedReason` (`"STATEMENT_PAID"` \| `"PLAN_HAS_PAYMENTS"` \| `null` u omitido) y `purchaseLockedNote(reason)` con el texto del aviso; se actualiza el comentario de `deletePurchase` |
| `src/features/purchases/PurchasesPage.tsx` | El menú de la fila depende de `lockedReason`: sin bloqueo ofrece Cancelar (solo activas) y Eliminar; con bloqueo no hay menú y la nota se muestra en el subtítulo |
| `src/features/purchases/PurchaseDetailDialog.tsx` | `canCancel`/`canDelete` respetan `lockedReason` y la nota se muestra en el diálogo |
| `src/features/purchases/purchases.test.tsx` | La prueba de "elimina una compra con mensualidades pagadas" se invierte: ahora comprueba la nota y la ausencia de acciones, más el detalle bloqueado |

La nota: "El corte de esta compra ya tiene pagos. Revierte el pago para
cancelarla o eliminarla." (o "La compra tiene pagos aplicados…" para planes).
El error 422 que llegara a escapar se sigue viendo con `ErrorAlert`, que ya
muestra el `detail` de la API.

## 3. Pruebas

```powershell
npx.cmd vitest run src/features/purchases/purchases.test.tsx
```

- una compra con `lockedReason: "PLAN_HAS_PAYMENTS"` muestra la nota y no
  ofrece el botón "Más acciones";
- el detalle de una compra con `lockedReason: "STATEMENT_PAID"` muestra la nota
  y no ofrece cancelar ni eliminar;
- las compras sin `lockedReason` siguen ofreciendo Cancelar y Eliminar.

## 4. Compatibilidad

- Depende del `lockedReason` de la API (fase 30 del backend); con respuestas
  antiguas (campo ausente) la web trata la compra como no bloqueada y el error
  de la API se muestra igual.
- El indicador usa el último estado guardado de los cortes: si el corte acaba
  de cerrarse y nadie lo ha sincronizado, la fila puede verse libre; el intento
  responde 422 con su mensaje y, tras el sincronizado, la nota aparece.
