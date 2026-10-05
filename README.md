# Cuentas Web (PWA)

Frontend de **Cuentas**, el asistente financiero personal. Consume la API del
repositorio hermano [`cuentas-api`](../cuentas-api).

## Estado del proyecto

| Fase | Descripción | Estado |
|---|---|---|
| 1 | Configuración inicial (Vite + React + TS, Tailwind, PWA, tipos OpenAPI, utilidades base) | ✅ Implementada |
| 2 | Autenticación (login, registro, verificación, recuperación, sesión con refresh) | ✅ Implementada |
| 3 | Layout principal y componentes compartidos | ⏳ Pendiente |
| 4 | CRUDs financieros (cuentas, movimientos, gastos, ingresos, tarjetas, pagos, compras, recomendador) | ⏳ Pendiente |
| 5 | Dashboard analítico, reglas y administración | ⏳ Pendiente |
| 6 | Optimización (PWA offline de lectura, accesibilidad, rendimiento, despliegue) | ⏳ Pendiente |

La documentación técnica completa del backend (endpoints, reglas de negocio,
modelos y requisitos de frontend) está en
`../cuentas-api/docs/documentacion-tecnica-backend.md`.

## Requisitos

- Node.js 24+
- npm 11+
- El backend `cuentas-api` corriendo en `http://localhost:3000` (para desarrollo)

## Instalación

```powershell
npm.cmd install
```

## Comandos

| Comando | Descripción |
|---|---|
| `npm.cmd run dev` | Servidor de desarrollo en http://localhost:5173 (proxy a la API) |
| `npm.cmd run build` | Typecheck + build de producción (genera PWA con service worker) |
| `npm.cmd run preview` | Sirve el build de producción |
| `npm.cmd run typecheck` | Solo verifica tipos |
| `npm.cmd run lint` | oxlint |
| `npm.cmd run test` | Vitest (una pasada) |
| `npm.cmd run test:watch` | Vitest en modo watch |
| `npm.cmd run api:types` | Regenera los tipos desde `../cuentas-api/docs/openapi-3.1.json` |

## Desarrollo con el backend

1. En `cuentas-api`: `npm.cmd run start:dev` (API en el puerto 3000).
2. En `cuentas-web`: `npm.cmd run dev` (http://localhost:5173).

Vite reenvía `/api` y `/health` al backend, así el navegador ve **un solo
origen** y la cookie `httpOnly` del refresh (`SameSite=Strict`) funciona sin
CORS.

Cuando la API cambie, regenera los tipos:

```powershell
npm.cmd run api:types
```

## Estructura

```
src/
├─ app/                  Arranque: providers de React Query, router y query client
├─ lib/
│  ├─ api/               Cliente tipado (openapi-fetch) y tipos generados (schema.d.ts)
│  ├─ dates.ts           Fechas YYYY-MM-DD y "hoy" en la zona horaria del usuario
│  ├─ money.ts           Pesos ↔ centavos (sin errores de punto flotante) y formato MXN
│  └─ problem.ts         Errores RFC 9457 (application/problem+json)
├─ features/             Un directorio por dominio (health, y en siguientes fases:
│                        auth, accounts, movements, income, expenses, cards, …)
└─ test/                 Configuración de Vitest
public/                  Íconos de la PWA
```

## Convenciones

- **Dinero:** la API usa centavos enteros; en la UI se captura y muestra en
  pesos con `parsePesosToCents` / `formatCents`.
- **Fechas:** `YYYY-MM-DD` sin zona horaria; "hoy" se calcula con la zona
  horaria configurada del usuario (`todayInTimeZone`), nunca con la del
  navegador.
- **Errores:** todos los fallos de la API se convierten en `ProblemError`
  (status, `detail`, `reason`, `requestId`, errores por campo).
- **Tipos:** no se escriben a mano los contratos; se generan desde OpenAPI.

## Documentación por fase

- [Fase 1 — Configuración inicial](docs/fase-01-configuracion.md)
- [Fase 2 — Autenticación](docs/fase-02-auth.md)
