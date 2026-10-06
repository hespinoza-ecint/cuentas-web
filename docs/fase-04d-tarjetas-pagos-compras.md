# Fase 4D — Tarjetas, pagos y compras

> Cuarto bloque de la Fase 4. Solo queda el recomendador (4E).

## 1. Objetivo

Cubrir el ciclo completo de las tarjetas de crédito: alta con corte y fecha
límite configurables, libro, estados de cuenta con conciliación y montos
reportados, pagos con asignaciones automáticas y compras regulares, MSI y
diferidas con anticipos y cancelaciones.

## 2. Lo que se agregó

| Pieza | Descripción |
|---|---|
| `/tarjetas` | Lista con utilización, disponible, corte y pago; crear (límite, tasa, anualidad, corte, fecha límite y saldo inicial), editar y eliminar |
| `/tarjetas/:id` | Resumen (saldo, disponible, anualidad), **ciclo actual** (periodo, cargos, vencimiento proyectado), **estados de cuenta** (con montos del banco y pagos aplicados), **libro** con filtro por tipo y cursor, conciliar, editar y eliminar |
| Conciliación | Ajusta el saldo a lo reportado por el banco con motivo (RN-15) y avisa la diferencia |
| Corte | Diálogo por corte con métricas, asignaciones de pagos y captura de **pago para no generar intereses** y **pago mínimo** reportados (RN-16/17) |
| `/pagos` | Lista con filtro por tarjeta, registro de pago (`Idempotency-Key`) con aplicación visible (mensualidades → corte → revolvente, RN-23), detalle con asignaciones y reverso con motivo |
| `/compras` | Lista con filtros (tarjeta, tipo, estado), próxima mensualidad, registrar compra (regular, MSI y diferida con tasa; comisión al inicio o prorrateada), detalle con plan y mensualidades, **anticipo/liquidación** y cancelación con motivo |
| Pruebas | 4 archivos nuevos (55 pruebas en total) |

## 3. Decisiones

- **El detalle de la tarjeta reutiliza los cálculos del backend** (`statements/current`,
  `statements`, `ledger`): no se replica el ciclo en el cliente.
- **En el libro, un cargo positivo se muestra en rojo** (aumenta la deuda), al
  contrario del efectivo; es presentación, no dato.
- **Cancelar una compra con pagos** devuelve 422 (`PLAN_HAS_PAYMENTS`): el error
  se muestra en el diálogo de motivo, sin promesas sin manejar.
- **Anticipos con `REDUCE_TERM`** (el backend no admite `REDUCE_PAYMENT`); al
  liquidar, el resultado indica `settled` y se muestra el aviso.
- **`useWatch`** en los formularios con campos condicionales, en lugar de
  `form.watch`, para no romper la memoización del React Compiler (oxlint).

## 4. Verificación

```powershell
npm.cmd run typecheck   # limpio
npm.cmd run test        # 20 archivos / 55 pruebas
npm.cmd run lint        # limpio
npm.cmd run build       # producción + PWA
```

Cobertura nueva:

- **Tarjetas:** listado con utilización/disponible y creación con límite en
  centavos y corte/días después del corte.
- **Detalle:** ciclo actual, cortes, libro y guardado de los montos reportados
  del corte.
- **Pagos:** listado, registro con aplicación (Corte) y reverso con motivo.
- **Compras:** listado con próxima mensualidad, alta MSI a 3 meses y
  cancelación con motivo.

## 5. Notas

- Queda pendiente de la Fase 4 el **recomendador** (4E): formulario, resultado
  explicado, historial y reglas propias.
- La edición de una ocurrencia recurrente con monto real (`actualAmount`)
  puede agregarse como mejora en la Fase 5.

## 6. Actualización — compras a meses ya iniciadas (backend Fase 10)

En MSI y diferidas el formulario tiene un campo opcional **Mes del primer
corte**: se elige el mes en que empezó a pagarse la compra (deja vacío si es
nueva). El backend marca las mensualidades ya vencidas como pagadas, la tarjeta
solo suma el principal pendiente y `Mensualidad` pasa a ser la primera vigente;
el detalle muestra las mensualidades pagadas y las pendientes. Cobertura nueva:
alta MSI con mes del primer corte.
