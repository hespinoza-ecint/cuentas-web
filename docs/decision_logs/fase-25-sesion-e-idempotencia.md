# Fase 25 — Sesión robusta en el cliente e idempotencia por intento (web)

Fecha: 2026-10-12. Ámbito: `cuentas-web` (consume los cambios de la API de la
fase 25).

## Contexto

- Cualquier fallo del refresh (sin red, 5xx, 429) deslogueaba al usuario y le
  vaciaba la sesión.
- Dos pestañas podían renovar a la vez y provocar el falso "robo" del token.
- Cada llamada financiera generaba una llave de idempotencia nueva, así que la
  protección del backend nunca cubría el caso real (reintentar tras perder la
  respuesta). Además `crypto.randomUUID` no existe con `http://IP` y la
  llamada tronaba.

## Decisiones

### 1. Solo un 401 cierra la sesión

`configureSessionRefresh` (lib/api/client.ts) devuelve `null` únicamente
cuando el servidor responde 401; cualquier otro fallo **lanza**.
`refreshSession` conserva la sesión activa ante fallos transitorios; en
arranque en frío sin red pasa a anónimo sin marcar el motivo "expirada".

### 2. Renovación serializada entre pestañas

`refreshSession` envuelve la llamada en `navigator.locks.request
('cuentas-session-refresh', …)` cuando existe; en su defecto queda el
single-flight de la pestaña. La gracia de la API cubre el resto de carreras.

### 3. Llave de idempotencia por intento

`newIdempotencyKey()` (lib/idempotency.ts) usa `crypto.randomUUID` y cae a
`getRandomValues`/`Math.random` en contextos no seguros. Los cinco diálogos
financieros (ajuste, pago, compra, anticipo, confirmación de ingreso) generan
la llave con `useRef`, la conservan durante los reintentos del mismo intento y
la regeneran tras un éxito.

### 4. Logout con cuerpo vacío

El contrato del POST /auth/logout ahora incluye cuerpo opcional; la web envía
`{}` y el servidor tolera su ausencia sin exigir un access token vigente.

## Consecuencias

- Reintentar un POST financiero tras perder la respuesta ya no duplica.
- Un corte de red no expulsa al usuario de la app ni vacía su caché.
- Sin cambios de esquema en la web.
