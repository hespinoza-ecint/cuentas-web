# Fase 16 — Ocurrencias vencidas de recurrentes (frontend)

## 1. Objetivo

Que una ocurrencia de gasto recurrente que ya pasó se pueda **confirmar** y se
registre con su fecha real, para que caiga en el corte que le corresponde. La
regla del backend está en `cuentas-api/docs/fase-16-recurrentes-vencidos.md`.

## 2. Qué cambió

| Pieza | Descripción |
|---|---|
| Lista de ocurrencias | Título "Ocurrencias por confirmar" y texto que aclara que incluye vencidas recientes y próximas |
| Confirmación | Ya no se envía `actualDate: hoy`; el backend decide (vencida → su día, futura → hoy) |
| Vencidas | Se muestran con "· vencida" (el texto ya existía pero no había datos que lo dispararan) |

## 3. Pruebas

```powershell
npx.cmd vitest run src/features/expenses/recurring.test.tsx   # 6 pruebas
```

- confirma una ocurrencia y verifica que **no** se manda `actualDate`;
- una ocurrencia con `daysUntil < 0` se muestra como "· vencida" con su botón
  **Confirmar**.
