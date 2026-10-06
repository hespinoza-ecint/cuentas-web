# Fase 4B — Gastos y gastos recurrentes

> Segundo bloque de la Fase 4. El siguiente es ingresos (fuentes, calendarios,
> próximos y confirmaciones).

## 1. Objetivo

Registrar gastos pagados con efectivo o débito, y administrar gastos
recurrentes (rentas, servicios, suscripciones) con calendario configurable,
proyección de próximas ocurrencias y confirmación de cada una.

## 2. Lo que se agregó

| Pieza | Descripción |
|---|---|
| `/gastos` | Lista con filtros (cuenta, categoría, fechas) y cursor, monto en rojo, categoría, marca de recurrente/revertido, registro de gasto y reverso con motivo |
| `/recurrentes` | Lista (con inactivos), crear/editar/eliminar, panel de **próximas ocurrencias** (60 días) con confirmación de uno en uno, frecuencia y calendario visibles |
| `ScheduleEditor` | Editor de calendarios reutilizable: semanal, quincenal (días separados por coma, `ULTIMO`), mensual, personalizado (cada N días / días del mes / fechas específicas) y único; regla de día inhábil y uso de festivos |
| `lib/schedule-form.ts` | Modelo, validación y conversión a/desde el `config` JSON del backend (probado a través de los formularios) |
| API | `expenses-api` y `recurring-expenses-api` tipadas desde OpenAPI |
| Pruebas | 2 archivos nuevos (42 pruebas en total): gastos y recurrentes |

## 3. Decisiones

- **La lógica del calendario vive en `lib/`**, no en el componente: evita
  avisos de Fast Refresh y permite reutilizarla en ingresos y en pruebas
  unitarias futuras.
- **La confirmación de una ocurrencia** registra el gasto con la fecha real
  (hoy del usuario) y luego invalida recurrentes, próximos, gastos y cuentas.
- **Editar un recurrente no cambia la frecuencia** (el `PATCH` del backend no
  lo permite): el selector se bloquea y solo se edita su configuración,
  fechas y reglas.
- **Los montos de gasto se muestran en negativo** con color rojo aunque en la
  API se guarden positivos; es una decisión de presentación (`MoneyDisplay`
  recibe `-amount`).
- **Concurrencia de pruebas:** con 15 archivos, el equipo no arranca más de 4
  workers de jsdom; se fijó `maxWorkers: 4` en Vitest.

## 4. Verificación

```powershell
npm.cmd run typecheck   # limpio
npm.cmd run test        # 15 archivos / 42 pruebas
npm.cmd run lint        # limpio
npm.cmd run build       # producción + PWA
```

Cobertura nueva:

- **Gastos:** listado con monto formateado y categoría, registro con monto en
  centavos y fecha del usuario, y reverso con motivo.
- **Recurrentes:** confirmación de ocurrencia (con `occurrenceDate` y fecha
  real del usuario), creación con calendario mensual (`config: { day: 1 }`) y
  eliminación con confirmación.

## 5. Notas

- El monto real de una ocurrencia se puede ajustar más adelante desde el
  gasto generado (reverso + nuevo gasto); el endpoint acepta `actualAmount`
  para cuando se agregue el diálogo de confirmación con edición.
- Sigue **ingresos**: fuentes con calendarios, próximos ingresos con
  confirmación/omisión e historial.

## 6. Actualización — pago con tarjeta de crédito (backend Fase 9)

El formulario de recurrentes ahora tiene **Método de pago** (`Cuenta de efectivo`
o `Tarjeta de crédito`); al elegir tarjeta se muestra el selector de tarjetas
activas. La tarjeta se puede cambiar después con `Editar` (mismo desplegable).

- Listado: bajo las fechas se muestra el origen (`Cuenta …` o `Tarjeta … •••• 1234`).
- Confirmar una ocurrencia de tarjeta registra una **compra** en la tarjeta (el
  aviso lo indica) y actualiza tarjetas, compras y dashboard.
- Cobertura nueva: alta de recurrente con tarjeta y confirmación con aviso de compra.
