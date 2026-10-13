# Fase 28 — Menores del cliente (web)

Fecha: 2026-10-13. Ámbito: `cuentas-web`.

## Contexto y decisiones

### 1. `invalidateFinancial` compartido

El dashboard no se refrescaba tras la mayoría de mutaciones (compras, pagos,
ajustes, confirmaciones) porque cada diálogo invalidaba solo sus claves. Se
centralizó en `lib/invalidate-financial.ts` la lista de colecciones que
dependen del dinero (`cashflow`, `dashboard`, `statements`, `movements`,
`cards`, `payments`…) y todos los diálogos financieros la llaman además de sus
invalidaciones específicas (las duplicadas se colapsan solas en React Query).

- Alternativa descartada: un helper con la clave exacta por mutación; se
  desincroniza en cuanto aparece una vista nueva que consume otra colección.

### 2. `MoneyInput` limpia el monto inválido

Con texto inválido el campo mostraba el aviso local pero conservaba el último
monto válido en el formulario: se podía enviar un importe que no era el que
veía el usuario. Ahora emite `undefined` y la validación del formulario lo
bloquea.

### 3. Nivel de uso según la configuración del usuario

El semáforo de utilización del dashboard estaba fijo en 30%/50%. Ahora usa
`maxUtilizationBps` del usuario: verde hasta el máximo, ámbar hasta 5/3 del
máximo (las bandas originales cuando el máximo es 30%) y rojo por encima.

## Consecuencias

- El dashboard y el flujo se mantienen frescos tras cualquier mutación
  financiera.
- Sin cambios de contrato; solo UI y refresco de datos.
