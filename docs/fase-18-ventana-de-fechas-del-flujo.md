# Fase 18 — Ventana de fechas del flujo (frontend)

## 1. Objetivo

Que la gráfica de flujo del dashboard tenga **selectores de fecha** (Desde /
Hasta) en lugar de un horizonte fijo, con un rango por defecto de **30 días a
partir de hoy**. La regla del backend está en
`cuentas-api/docs/fase-18-ventana-de-fechas-del-flujo.md` (RN-29).

## 2. Qué cambió

| Pieza | Descripción |
|---|---|
| Tarjeta de la gráfica | Dos campos `date`: **Desde** (default hoy, mínimo hoy) y **Hasta** (default hoy + 30, máximo Desde + 5 años) |
| Consulta | `['cashflow', 'projection', from, to]`: al cambiar el rango se vuelve a pedir y la tarjeta se refresca |
| Subtítulos | "Del {desde} al {hasta}" en la gráfica y en la tarjeta de flujo mínimo |
| Ajustes | Si Hasta queda antes que Desde, se reajusta a Desde + 30; Desde nunca baja de hoy |
| API | `fetchCashflowProjection({ from, to })` |

## 3. Pruebas

```powershell
npx.cmd vitest run src/features/dashboard/dashboard.test.tsx   # 3 pruebas
```

- la petición inicial usa `from = hoy` y `to = hoy + 30`;
- al cambiar **Hasta** se vuelve a pedir la proyección con el nuevo rango.

## 4. Despliegue

Frontend + backend:

```bash
docker compose build api web && docker compose up -d
```
