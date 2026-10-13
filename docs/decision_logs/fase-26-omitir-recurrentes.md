# Fase 26 — Omitir ocurrencias de recurrentes (web)

Fecha: 2026-10-13. Ámbito: `cuentas-web`.

## Contexto

La API ganó `POST /recurring-expenses/:id/skip` (fase 26): una ocurrencia que
no se pagará se omite y deja de proyectarse. Los ingresos ya tenían el suyo
con este flujo: acción "Omitir esta fecha" en el menú ⋯ + diálogo de
confirmación.

## Decisión

Replicar el flujo de ingresos en la lista de ocurrencias de recurrentes, en su
forma más simple: un botón secundario **Omitir** junto a Confirmar que abre un
`ConfirmDialog`, con el aviso "Ocurrencia omitida: ya no se proyecta." y la
invalidación de `recurring-upcoming` (y del dashboard, que proyecta el gasto).

- Se descartó el menú ⋯ porque la fila ya tiene una acción principal visible y
  solo se agrega una secundaria.
- Los errores del servidor (409 al ya estar omitida/confirmada desde otro
  dispositivo, 422 con fecha desactualizada) se muestran con el aviso estándar
  del diálogo.

## Consecuencias

- Paridad funcional entre ingresos y gastos recurrentes.
- La idea de "omitir" queda registrada en el servidor (auditoría y proyección
  consistentes), no solo en la UI.
