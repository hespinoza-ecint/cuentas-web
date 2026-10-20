# Pruebas E2E con Playwright

## 1. Objetivo

Probar la PWA completa contra el **backend real** (Nest + MySQL `Cuentas_Test`) en un
navegador: registro con verificación, inicio de sesión, finanzas y
recomendación, tal como los usa una persona.

## 2. Cómo correrlas

```powershell
# una sola vez
npx.cmd playwright install chromium

# desde cuentas-web (hace build del backend y levanta ambos servidores)
npm.cmd run test:e2e
```

- Requiere los puertos **3000** (API) y **5173** (Vite) libres; si tienes el
  entorno de desarrollo encendido, deténlo antes.
- Usa la base MySQL `Cuentas_Test` (la misma que Jest): no corras `npm test` de la
  API y el E2E al mismo tiempo, porque ambos la resetean.
- `pretest:e2e` compila el backend; la suite arranca sola la API y el frontend.
- Artefactos en `test-results/` (trazas y capturas solo cuando algo falla):
  `npx playwright show-trace <trace.zip>`.

## 3. Cómo está armado

| Pieza | Rol |
|---|---|
| `playwright.config.ts` | Dos `webServer`: el backend (`node scripts/e2e-server.mjs` con la base `Cuentas_Test` y `AUTH_THROTTLE_LIMIT=1000` para no chocar con el límite de 5/min) y Vite con proxy a la API. Proyectos: `desktop` (Chrome) y `mobile` (Pixel 7) |
| `cuentas-api/scripts/e2e-server.mjs` | Genera el esquema/cliente MySQL, resetea `Cuentas_Test` con `prisma db push --force-reset`, siembra y levanta `dist/main.js` |
| `cuentas-api/scripts/verify-email.mjs` | Marca un correo como verificado en la base E2E (el enlace real llega al log del backend) |
| `e2e/config.ts` | Deriva la URL de `Cuentas_Test` desde `cuentas-api/.env` (mismo host y credenciales), secreto JWT de prueba y ruta del backend |
| `e2e/helpers.ts` | Correos únicos por corrida y `verifyUserEmail()` |
| `e2e/full-flow.spec.ts` | Escenarios de escritorio (modo serial) |
| `e2e/mobile.spec.ts` | Escenario móvil: navegación de la barra inferior, hoja "Más", acciones rápidas y diálogos sin recortes (modo serial) |

## 4. Escenarios

1. **Credenciales inválidas** (escritorio): el mensaje del backend se muestra en el login.
2. **Flujo completo** (escritorio):
   - registro y pantalla de verificación,
   - verificación del correo (directo en la BD de E2E),
   - login → dashboard ("Hola, QA"),
   - cuenta de efectivo con saldo inicial ($1,000.00),
   - tarjeta de crédito,
   - compra a 3 MSI (aparece con su próxima mensualidad),
   - recomendación (resultado visible con disclaimer),
   - cierre de sesión.
3. **Flujo móvil** (Pixel 7): la barra inferior (Inicio · Movimientos · ＋ ·
   Tarjetas · Más), las pestañas de módulo para llegar a Cuentas, alta de
   cuenta, un gasto con el botón "＋" y su aviso de éxito, la compra rápida sin
   tarjetas (invita a crearlas) y comprobaciones de `scrollWidth` y botones
   dentro del viewport.

## 5. Bugs reales que encontraron las E2E

| Bug | Corrección |
|---|---|
| `GET /purchases?limit=20` devolvía 400: faltaba `@Type(() => Number)` en el DTO | Decorador agregado + prueba de regresión |
| `GET /cards/:id/ledger?limit=20` tenía el mismo problema | Decorador agregado + prueba de regresión |
| El menú de usuario (17 elementos) se salía del viewport y "Cerrar sesión" no era alcanzable | `max-h-[70vh] overflow-y-auto` en el menú |
| React avisaba claves repetidas en la gráfica de flujo sin eventos | Clave con índice además de la fecha |
| `LOG_LEVEL=silent` con el transporte de pino impedía que el servidor escuchara al arrancar en segundo plano | El E2E usa `LOG_LEVEL=error` (documentado aquí) |

## 6. Notas

- Los datos de E2E viven en la base MySQL `Cuentas_Test`, separada de la base
  de desarrollo; cada corrida la resetea y crea usuarios nuevos.
- Para CI: instalar Chromium, dar acceso al MySQL del servidor y ejecutar
  `npm.cmd run test:e2e`.
- El cliente de Prisma debe ser el de MySQL (lo genera `e2e-server.mjs`). Si lo
  cambias a SQLite con `npm.cmd run prisma:generate`, la API falla con "the URL
  must start with file:" hasta volver a generarlo con `--schema
  prisma/schema.mysql.prisma`.
