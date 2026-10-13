# Fase 29 — Montos sugeridos al registrar un pago (web)

Fecha: 2026-10-13. Ámbito: `cuentas-web`.

## Contexto y decisiones

### 1. Derivar las sugerencias en el cliente

Al registrar un pago, el monto se capturaba a mano aunque el dato ya viajara
en `GET /cards/{id}/statements`. Se decidió calcular las sugerencias en el
frontend con una función pura (`features/payments/payment-suggestions.ts`)
sobre la misma llave `['statements', id]` del detalle de tarjeta, en lugar de
agregar un endpoint o campos nuevos a la API.

- Alternativa descartada: un endpoint `…/statements/{id}/summary` o un
  "monto sugerido" en el listado; duplica una regla que el dashboard ya
  implementa y obliga a mantener OpenAPI y tipos.
- La regla es la del dashboard: solo el corte pendiente más reciente cuenta
  como deuda (ya incluye el saldo anterior sin cubrir) y el efectivo es
  `noInterestPaymentReported ?? noInterestPaymentCalc` menos `paidAmount`.

### 2. Botones que llenan el campo, no envían

Los chips solo escriben en el campo Monto (`shouldDirty` + `shouldValidate`):
la captura manual y la validación existentes siguen mandando y no hay
caminos de envío paralelos.

- Los montos en cero, negativos tras descontar lo pagado, o repetidos (el
  mínimo igual al total del corte) no se ofrecen; el marcado del elegido es
  `aria-pressed`, sin colores ni estados nuevos.

## Consecuencias

- Sin cambios de contrato con la API; el formulario degrada a la captura
  manual si la consulta de cortes falla o está cargando.
- Si el backend cambia la regla del saldo pendiente (reportado contra
  calculado), la UI se ajusta en un solo módulo con sus pruebas.
