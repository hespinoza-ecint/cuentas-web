# Fase 4A — Finanzas base: cuentas, movimientos y categorías

> La Fase 4 se entrega por bloques. Este es el bloque A: la base del dinero en
> efectivo. Siguen ingresos, tarjetas, pagos, compras y recomendador.

## 1. Objetivo

Primer bloque de CRUDs financieros: cuentas de efectivo con su saldo, libro de
movimientos con ajustes y reversos, transferencias entre cuentas, recálculo de
saldo desde el libro y categorías propias.

## 2. Lo que se agregó

| Pieza | Descripción |
|---|---|
| `/cuentas` | Lista con saldo, tipo, predeterminada/no gastable y estado. Crear (con saldo inicial opcional), editar, registrar saldo inicial, recalcular desde el libro y eliminar (bloqueado con saldo ≠ 0) |
| `/movimientos` | Libro con filtros (cuenta, tipo, rango de fechas), paginación por cursor (“Cargar más”), detalle, **ajuste manual** (monto con signo + motivo obligatorio) y **reverso** con diálogo de motivo |
| `/categorias` | Categorías propias con nombre, tipo (`EXPENSE`/`INCOME`/`BOTH`), padre (un solo nivel) e ícono; el sistema se muestra aparte y es de solo lectura |
| Diálogos | `AccountFormDialog`, `AccountEditDialog`, `TransferDialog`, `OpeningBalanceDialog`, `AdjustmentDialog`, `CategoryFormDialog` y los compartidos `ReasonDialog` y `SelectField` |
| API | `accounts-api`, `movements-api`, `categories-api` (tipadas desde OpenAPI) y `useSettings`/`useToday` para calcular fechas con la zona horaria del usuario |
| Pruebas | 3 archivos nuevos (36 pruebas en total): cuentas, movimientos y categorías |

## 3. Decisiones

- **Idempotencia en el cliente:** los POST financieros (ajustes) envían un
  `Idempotency-Key` generado con `crypto.randomUUID()`.
- **Los diálogos se montan solo al abrirse** (`{open && <Dialog/>}`). Montarlos
  siempre hacía que su formulario se inicializara antes de que cargaran los
  datos (cuentas vacías en los `select`); las pruebas lo detectaron.
- **`ConfirmDialog` captura el error del padre:** si una mutación falla, el
  diálogo permanece abierto y la página muestra el `ErrorAlert` (por ejemplo,
  `ACCOUNT_WITH_BALANCE`), sin promesas rechazadas sin manejar.
- **Fechas:** todos los formularios usan `useToday()` (zona horaria del
  usuario) y limitan las fechas al día actual (RN-06/RN-07).
- **Saldo inicial:** se ofrece siempre; si ya existe, el backend responde 409
  (`OPENING_BALANCE_EXISTS`) y el error se muestra en el propio diálogo.

## 4. Verificación

```powershell
npm.cmd run typecheck   # limpio
npm.cmd run test        # 13 archivos / 36 pruebas
npm.cmd run lint        # limpio
npm.cmd run build       # producción + PWA
```

Cobertura nueva:

- **Cuentas:** listado con montos formateados, creación con saldo inicial en
  centavos y fecha del usuario, transferencia con cuentas por defecto y error
  de eliminación con saldo (`ACCOUNT_WITH_BALANCE`).
- **Movimientos:** paginación por cursor, ajuste manual con motivo y monto
  negativo, y reverso con diálogo de motivo.
- **Categorías:** separación propias/sistema, creación y eliminación con
  confirmación.

## 5. Notas

- El filtro por tipo del libro incluye los 8 tipos del backend; los movimientos
  ya revertidos ocultan la acción “Revertir”.
- La siguiente entrega de la Fase 4 son **gastos y gastos recurrentes** y, en
  seguida, **ingresos** (fuentes, calendarios, próximos y confirmaciones).
