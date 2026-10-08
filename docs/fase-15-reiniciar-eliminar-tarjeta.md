# Fase 15 — Reiniciar y eliminar tarjetas (frontend)

## 1. Objetivo

Dar en **Tarjetas** (y en el detalle de cada tarjeta) las acciones **Reiniciar**
y **Eliminar** de la regla RN-28 del backend
(`cuentas-api/docs/fase-15-reiniciar-eliminar-tarjeta.md`):

- **Reiniciar**: borra el historial de la tarjeta y la deja como nueva (saldo $0
  y crédito completo), conservando la tarjeta.
- **Eliminar**: borra la tarjeta y todo su historial (cortes, pagos, compras,
  movimientos y los recurrentes configurados con ella).

## 2. Qué cambió

| Pieza | Descripción |
|---|---|
| Lista de tarjetas | Nuevo botón **Reiniciar**; **Eliminar** ahora en rojo suave. Ambos abren `ReasonDialog` (motivo obligatorio) con el detalle de lo que se borra y qué **no** se toca (lo pagado en efectivo) |
| Detalle de la tarjeta | Mismas acciones en la cabecera; al reiniciar se refresca todo (saldo, cortes, libro, ciclo) y al eliminar vuelve a la lista |
| Avisos | Se muestra el mensaje del servidor ("quedó como nueva…", "… fueron eliminados") |
| Aviso honesto | El diálogo de eliminar ya no dice "solo si no tiene deuda": ahora se puede borrar cualquier tarjeta, con todo y deuda, y el texto lo advierte |
| API | `resetCard(id, reason)` y `deleteCard(id, reason)` (reemplazan a `removeCard`); tipos regenerados con `npm.cmd run api:types` |

## 3. Pruebas

```powershell
npx.cmd vitest run src/features/cards/cards.test.tsx   # 4 pruebas
```

- **reinicia** una tarjeta: el diálogo explica el resultado, envía el motivo y
  aparece el aviso del servidor;
- **elimina** la tarjeta con todo su historial: motivo obligatorio y aviso.

## 4. Despliegue

Frontend + backend (la ruta es nueva):

```bash
docker compose build api web && docker compose up -d
```

Sin SQL pendiente.
