# Fase 4C — Ingresos

> Tercer bloque de la Fase 4. Siguen tarjetas, cortes, pagos, compras y el
> recomendador.

## 1. Objetivo

Administrar fuentes de ingreso con sus calendarios, ver los próximos ingresos
con las reglas del backend aplicadas (días inhábiles y factor conservador) y
confirmar u omitir cada fecha estimada, con historial.

## 2. Lo que se agregó

| Pieza | Descripción |
|---|---|
| `/ingresos` | Panel con tres secciones: próximos ingresos (60 días), fuentes con sus calendarios e historial paginado |
| Próximos | Confirmar (monto real y fecha real, con `Idempotency-Key`) u omitir una fecha; marca de vencido y de ingreso variable |
| Fuentes | Crear (nombre, cuenta, categoría, pagador, tipo fijo/variable, monto estimado y **primer calendario**), editar y eliminar |
| Calendarios | Agregar/editar/eliminar con `ScheduleEditor`, monto propio opcional y activar/desactivar |
| Historial | Confirmaciones y omisiones con estado, esperado vs real y notas; paginación por cursor |
| API | `income-api` tipada (fuentes, calendarios, próximos, transacciones, confirmar, omitir) |
| Pruebas | 1 archivo nuevo (46 pruebas en total): próximos/fuentes/historial, confirmar, omitir y crear fuente |

## 3. Decisiones

- **El backend ya aplica RN-09/10/11** en `/income/upcoming`: la UI solo muestra
  el resultado (`expectedAmount`, `overdue`, `daysUntil`) y explica las reglas.
- **Confirmar usa `actualAmount` y `actualDate`**: el monto esperado llega
  precargado para que el caso normal sea un solo clic.
- **Omitir** es una acción simple con confirmación; las notas quedan para
  cuando se agregue la edición fina.
- **Una fuente puede tener varios calendarios** (sueldo + bono); en la tarjeta
  de cada fuente se listan con un resumen legible del `config`.
- **Eliminar** fuente o calendario es borrado lógico en el backend: los
  ingresos ya confirmados se conservan.

## 4. Verificación

```powershell
npm.cmd run typecheck   # limpio
npm.cmd run test        # 16 archivos / 46 pruebas
npm.cmd run lint        # limpio
npm.cmd run build       # producción + PWA
```

Cobertura nueva:

- Próximos/fuentes/historial renderizan montos, calendario mensual y estado.
- **Confirmar** envía `incomeSourceId`, `incomeScheduleId`, `expectedDate`,
  monto real en centavos y la fecha real del usuario.
- **Omitir** envía la fecha esperada y muestra el aviso.
- **Crear fuente** envía el primer calendario con `config` mensual (`{ day: 1 }`)
  y la fecha de inicio del usuario.

## 5. Notas

- La Fase 4D cubre tarjetas (corte y fecha límite), estados de cuenta,
  conciliación, pagos con asignaciones y compras (regulares, MSI y diferidas
  con anticipos y cancelaciones).
