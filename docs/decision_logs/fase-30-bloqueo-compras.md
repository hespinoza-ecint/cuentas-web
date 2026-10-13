# Fase 30 — Bloqueo de compras con corte pagado (web)

Fecha: 2026-10-13. Ámbito: `cuentas-web`.

## Contexto y decisiones

### 1. La API manda; la web solo oculta

El bloqueo real vive en la API (422 `PURCHASE_STATEMENT_PAID` /
`PLAN_HAS_PAYMENTS`). Para no ofrecer acciones condenadas, la web usa la pista
`lockedReason` que la API agrega a las compras, en lugar de recalcular el estado
de los cortes en el cliente.

- Alternativa descartada: derivar el bloqueo en la web cruzando cortes,
  asignaciones y fechas. Duplica la regla del backend, exige más consultas en
  el listado y se desincroniza con facilidad.
- `lockedReason` es de solo lectura y puede quedarse corto hasta el siguiente
  sincronizado de cortes (por ejemplo, un anticipo adoptado al cerrar el
  corte); en ese caso la API rechaza con su mensaje y la interfaz lo muestra.

### 2. Ocultar acciones, no deshabilitarlas

En vez de botones deshabilitados o menús con acciones que fallan, la fila sin
acciones ("⋯" ausente) y una nota con el motivo y la salida ("Revierte el
pago"). Es el patrón de RN-30: el camino de corrección existente (revertir el
pago o un ajuste) se explica, no se bloquea en silencio.

- Se descartó mostrar el menú con Cancelar/Eliminar deshabilitados: las
  acciones destructivas sin explicación confunden más que su ausencia.

### 3. Los pagos "fuera de la app" no bloquean

Un plan "al corriente" tiene mensualidades marcadas como pagadas sin
asignaciones de pago; la web ya no usa `paidAmount > 0` para esconder Cancelar
(lo hacía por heurística) y confía en `lockedReason`, que solo cuenta pagos
aplicados desde la app.

## Consecuencias

- Cambio de contrato menor con la API (campo nuevo); sin migraciones en la web.
- Las pruebas de compras cubren el listado bloqueado y el detalle bloqueado; la
  degradación con respuestas sin `lockedReason` es no bloquear.
