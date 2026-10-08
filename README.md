# Cuentas Web (PWA)

Frontend de **Cuentas**, el asistente financiero personal. Consume la API del
repositorio hermano [`cuentas-api`](../cuentas-api).

## Estado del proyecto

| Fase | Descripción | Estado |
|---|---|---|
| 1 | Configuración inicial (Vite + React + TS, Tailwind, PWA, tipos OpenAPI, utilidades base) | ✅ Implementada |
| 2 | Autenticación (login, registro, verificación, recuperación, sesión con refresh) | ✅ Implementada |
| 3 | Layout principal, componentes compartidos y dashboard | ✅ Implementada |
| 4A | Finanzas base: cuentas, movimientos y categorías | ✅ Implementada |
| 4B | Gastos y gastos recurrentes (recurrentes pagables con tarjeta) | ✅ Implementada |
| 4C | Ingresos (fuentes, calendarios, confirmaciones e historial) | ✅ Implementada |
| 4D | Tarjetas, cortes, pagos y compras (MSI/diferidas ya iniciadas al corriente) | ✅ Implementada |
| 4E | Recomendador, historial y reglas | ✅ Implementada |
| 5 | Dashboard analítico, administración y cuenta/datos (exportación completa y reset total o solo de tarjetas) | ✅ Implementada |
| 6 | Optimización (code splitting, offline de lectura, accesibilidad, despliegue) | ✅ Implementada |
| E2E | Playwright contra el backend real (ver `docs/e2e-playwright.md`) | ✅ Implementada |
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
| `npm.cmd run test:e2e` | Playwright contra el backend real (ver `docs/e2e-playwright.md`) |
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
├─ app/                  Shell autenticado (sidebar, header, tab bar), providers, router y navegación
├─ components/
│  ├─ ui/                Primitivos estilo shadcn (Button, Card, Badge, Dialog, Skeleton, …)
│  └─ shared/            MoneyDisplay, MoneyInput, StatusBadge, ErrorAlert, Field, …
├─ lib/
│  ├─ api/               Cliente tipado (openapi-fetch) y tipos generados (schema.d.ts)
│  ├─ auth/              Sesión en memoria y refresh con single-flight
│  ├─ dates.ts           Fechas YYYY-MM-DD, mes y "hoy" en la zona horaria del usuario
│  ├─ money.ts           Pesos ↔ centavos (sin errores de punto flotante) y formato MXN
│  └─ problem.ts         Errores RFC 9457 (application/problem+json)
├─ features/             Un directorio por dominio (auth, dashboard, profile, settings, sessions, users, health)
└─ test/                 MSW, helpers de render y configuración de Vitest
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

## Despliegue en producción

### Docker (recomendado)

El frontend se compila y se sirve desde un contenedor **nginx** que hace de proxy
`/api` y `/health` hacia el contenedor del **backend** (mismo host, MySQL
externo). El navegador solo habla con este contenedor, así la cookie del refresh
(`SameSite=Strict`) sigue funcionando sin CORS.

```bash
# desde cuentas-api (con cuentas-web clonado como hermano)
docker compose build
docker compose up -d
```

El puerto público del front se ajusta con `WEB_BIND` (default `8080:80`) y el
destino del proxy con `API_BACKEND` (default `http://api:3000`). La guía completa
está en
[`cuentas-api/docs/despliegue-docker.md`](../cuentas-api/docs/despliegue-docker.md).

### Sin Docker (tres máquinas Ubuntu)

Frontend (nginx), backend (Nest) y MySQL dedicado.

1. `npm.cmd run build` en esta carpeta.
2. Copia `dist/` a `/var/www/cuentas-web/dist` en la máquina del front.
3. Adapta `deploy/nginx.conf.example` (dominio y `set $api_backend`) y actívalo.
4. HTTPS con `certbot` (obligatorio para la PWA y las cookies `Secure`).

La guía completa (MySQL, systemd del backend, nginx, respaldos y
actualizaciones) está en
[`cuentas-api/docs/despliegue-3-maquinas.md`](../cuentas-api/docs/despliegue-3-maquinas.md).

## Documentación por fase

- [Fase 1 — Configuración inicial](docs/fase-01-configuracion.md)
- [Fase 2 — Autenticación](docs/fase-02-auth.md)
- [Fase 3 — Layout principal, componentes y dashboard](docs/fase-03-layout.md)
- [Fase 4A — Finanzas base: cuentas, movimientos y categorías](docs/fase-04a-finanzas-base.md)
- [Fase 4B — Gastos y gastos recurrentes](docs/fase-04b-gastos-recurrentes.md)
- [Fase 4C — Ingresos](docs/fase-04c-ingresos.md)
- [Fase 4D — Tarjetas, pagos y compras](docs/fase-04d-tarjetas-pagos-compras.md)
- [Fase 4E — Recomendador, historial y reglas](docs/fase-04e-recomendador.md)
- [Fase 5 — Dashboard analítico, administración y cuenta/datos](docs/fase-05-analitica-admin-cuenta.md)
- [Fase 6 — Optimización y despliegue](docs/fase-06-optimizacion.md)
- [Fase 12 — Experiencia móvil y responsividad](docs/fase-12-responsivo-movil.md)
- [Fase 13 — Modo oscuro](docs/fase-13-modo-oscuro.md)
- [Fase 14 — Eliminar compras con mensualidades](docs/fase-14-eliminar-compras.md)
- [Fase 15 — Reiniciar y eliminar tarjetas](docs/fase-15-reiniciar-eliminar-tarjeta.md)
- [Fase 16 — Ocurrencias vencidas de recurrentes](docs/fase-16-recurrentes-vencidos.md)
- [Fase 17 — Flujo de efectivo hasta la última mensualidad](docs/fase-17-flujo-hasta-ultima-mensualidad.md)
- [Pruebas E2E con Playwright](docs/e2e-playwright.md)
