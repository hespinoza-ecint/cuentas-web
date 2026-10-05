# Pruebas E2E con Playwright

## 1. Objetivo

Probar la PWA completa contra el **backend real** (Nest + SQLite) en un
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
- `pretest:e2e` compila el backend; la suite arranca sola la API y el frontend.
- Artefactos en `test-results/` (trazas y capturas solo cuando algo falla):
  `npx playwright show-trace <trace.zip>`.

## 3. Cómo está armado

| Pieza | Rol |
|---|---|
| `playwright.config.ts` | Dos `webServer`: el backend (`node scripts/e2e-server.mjs` con base E2E aislada y `AUTH_THROTTLE_LIMIT=1000` para no chocar con el límite de 5/min) y Vite con proxy a la API |
| `cuentas-api/scripts/e2e-server.mjs` | Aplica migraciones y seed sobre la base E2E, espera un segundo (para que el seed suelte el archivo SQLite) y levanta `dist/main.js` |
| `cuentas-api/scripts/verify-email.mjs` | Marca un correo como verificado en la base E2E (el enlace real llega al log del backend) |
| `e2e/config.ts` | Base E2E en `%LOCALAPPDATA%/Cuentas/data/cuentas-e2e.db`, secreto JWT de prueba y ruta del backend |
| `e2e/helpers.ts` | Correos únicos por corrida y `verifyUserEmail()` |
| `e2e/full-flow.spec.ts` | Escenarios (modo serial) |

## 4. Escenarios

1. **Credenciales inválidas**: el mensaje del backend se muestra en el login.
2. **Flujo completo**:
   - registro y pantalla de verificación,
   - verificación del correo (directo en la BD de E2E),
   - login → dashboard ("Hola, QA"),
   - cuenta de efectivo con saldo inicial ($1,000.00),
   - tarjeta de crédito,
   - compra a 3 MSI (aparece con su próxima mensualidad),
   - recomendación (resultado visible con disclaimer),
   - cierre de sesión.

## 5. Bugs reales que encontraron las E2E

| Bug | Corrección |
|---|---|
| `GET /purchases?limit=20` devolvía 400: faltaba `@Type(() => Number)` en el DTO | Decorador agregado + prueba de regresión |
| `GET /cards/:id/ledger?limit=20` tenía el mismo problema | Decorador agregado + prueba de regresión |
| El menú de usuario (17 elementos) se salía del viewport y "Cerrar sesión" no era alcanzable | `max-h-[70vh] overflow-y-auto` en el menú |
| React avisaba claves repetidas en la gráfica de flujo sin eventos | Clave con índice además de la fecha |
| `LOG_LEVEL=silent` con el transporte de pino impedía que el servidor escuchara al arrancar en segundo plano | El E2E usa `LOG_LEVEL=error` (documentado aquí) |

## 6. Notas

- Los datos de E2E viven en `cuentas-e2e.db`, separada de la base de
  desarrollo; el seed es idempotente y cada corrida crea un usuario nuevo.
- Para CI: instalar Chromium y ejecutar `npm.cmd run test:e2e`; no requiere
  Docker ni MySQL.
