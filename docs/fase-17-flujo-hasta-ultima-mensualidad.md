# Fase 17 — Flujo de efectivo hasta la última mensualidad (frontend)

> **Actualizado en la fase 18**: la gráfica ahora tiene una **ventana de fechas**
> seleccionable (default 30 días). Ver
> `fase-18-ventana-de-fechas-del-flujo.md`.

## 1. Objetivo

Que la gráfica de flujo del dashboard muestre el panorama completo de las
compras a meses: cada mensualidad con sus ingresos, hasta la última. La regla
del backend está en `cuentas-api/docs/fase-17-flujo-hasta-ultima-mensualidad.md`
(RN-29).

## 2. Qué cambió

| Pieza | Descripción |
|---|---|
| `dashboard-api.ts` | `fetchCashflowProjection(days?)`: sin `days`, omite el parámetro para que el servidor elija el horizonte (hasta la última obligación programada) |
| `DashboardPage` | Pide la proyección sin días y la cachea con la clave `['cashflow', 'projection']` |
| Gráfica | El subtítulo "Próximos N días" sale del `horizonDays` de la respuesta: ahora puede decir 730 días y el mínimo mostrado es el real de todo el plazo |

## 3. Pruebas

```powershell
npx.cmd vitest run src/features/dashboard/dashboard.test.tsx   # 2 pruebas
```

La gráfica sigue renderizando con el mismo fixture (el mock responde al
endpoint con o sin `days`).

## 4. Despliegue

Frontend + backend:

```bash
docker compose build api web && docker compose up -d
```
