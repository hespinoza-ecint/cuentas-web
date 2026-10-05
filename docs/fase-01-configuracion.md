# Fase 1 — Configuración inicial

## 1. Objetivo

Dejar el proyecto del frontend listo para construir la PWA: toolchain, estilos,
PWA, tipos generados desde la API, utilidades base (dinero, fechas, errores) y
una pantalla mínima que verifica la conexión con el backend.

## 2. Lo que se agregó

| Pieza | Descripción |
|---|---|
| Proyecto Vite + React 19 + TypeScript | TypeScript estricto (`noUnusedLocals`, `verbatimModuleSyntax`, `erasableSyntaxOnly`), alias `@/*` |
| Tailwind CSS 4 | Vía `@tailwindcss/vite`; shadcn/ui se instalará en la Fase 3 |
| PWA base | `vite-plugin-pwa` (autoUpdate, manifest, íconos SVG normal y maskable, service worker generado en el build) |
| Proxy de desarrollo | `/api` y `/health` → `http://localhost:3000`; mismo origen para la cookie `SameSite=Strict` |
| Tipos OpenAPI | `openapi-typescript` genera `src/lib/api/schema.d.ts` desde `../cuentas-api/docs/openapi-3.1.json` (`npm run api:types`) |
| Cliente tipado | `openapi-fetch` en `src/lib/api/client.ts` |
| `lib/money.ts` | `parsePesosToCents` (conversión por texto, sin flotantes) y `formatCents` (es-MX, MXN) |
| `lib/dates.ts` | `todayInTimeZone` (zona del usuario), `addDays`, `formatLocalDate` |
| `lib/problem.ts` | `ProblemError` tipado para RFC 9457 (`detail`, `reason`, `requestId`, errores por campo) |
| App mínima | Pantalla de salud (`/`) con React Query y el cliente tipado; estados de carga y error |
| Pruebas | Vitest + Testing Library + jsdom: 3 archivos / 8 pruebas de dinero, fechas y errores |

## 3. Decisiones

- **Sin CORS en desarrollo ni producción:** el navegador siempre habla con el
  mismo origen (Vite proxy en desarrollo; nginx en producción).
- **Tipos generados, no escritos:** cualquier cambio del backend se refleja con
  `npm run api:types`; el resultado se versiona para que el build no dependa
  del repositorio del backend.
- **Dinero por cadena de texto:** convertir "1,234.56" a `123456` evita los
  errores clásicos de `parseFloat`.
- **"Hoy" del usuario, no del navegador:** la zona horaria viene de
  `GET /users/me/settings`; las utilidades están preparadas para recibirla.
- **Pool `threads` en Vitest:** el pool de `forks` no arranca workers en la
  ruta de OneDrive de este equipo en Windows.

## 4. Verificación

```powershell
npm.cmd run typecheck
npm.cmd run test
npm.cmd run lint
npm.cmd run build
```

Además, con el backend encendido (`cuentas-api`: `npm.cmd run start:dev`) y el
frontend en `npm.cmd run dev`, la pantalla `/` muestra el estado del backend
(versión, entorno y base de datos) a través del proxy.

## 5. Notas

- Los íconos de la PWA son SVG; si algún navegador exige PNG, se generarán en
  la Fase 6.
- El service worker hace precache del shell; la estrategia de datos sin
  conexión (solo lectura) se implementa en la Fase 6.
- La instalación de dependencias tarda por la ubicación en OneDrive; los
  comandos funcionan con `npm.cmd` (el alias `npm` está bloqueado por la
  política de PowerShell de este equipo).
