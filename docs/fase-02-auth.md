# Fase 2 — Autenticación

## 1. Objetivo

Cubrir el ciclo completo de sesión en la PWA: registro, verificación de correo,
login, recuperación de contraseña, recuperación de sesión al abrir la app,
renovación automática del token y cierre de sesión, con guardas de ruta.

## 2. Lo que se agregó

| Pieza | Descripción |
|---|---|
| `lib/auth/session.ts` | Sesión **en memoria**: access token + usuario, suscripción para React y refresh con *single-flight* (varias peticiones con 401 comparten una sola llamada de red) |
| `lib/api/client.ts` | Middleware del cliente tipado: adjunta `Authorization`, y ante un **401** renueva la sesión y **reintenta la petición original** una vez (guarda el cuerpo para el reintento) |
| `lib/problem.ts` | `problemFrom(error, response)`: usa el `problem+json` que ya parseó `openapi-fetch` (que consume el cuerpo) y conserva `detail`, `reason` y errores por campo |
| Guardas | `SessionGate` (recupera sesión al abrir), `RequireAuth` (redirige a `/login` guardando el destino) y `RedirectIfAuthenticated` |
| Páginas | `/login`, `/registro`, `/verificar-correo` (auto-verifica con `?token=` y permite reenviar), `/recuperar`, `/restablecer?token=`, inicio temporal con cierre de sesión |
| Componentes | `Field` (label + error accesible), `ErrorAlert` (RFC 9457 con `requestId`), `LoadingScreen`, `NotFoundPage` |
| Pruebas | MSW + Testing Library: 5 archivos / 17 pruebas (sesión, login, errores 401/423, guardas, verificación, registro y renovación con reintento) |

## 3. Decisiones

- **El access token vive en memoria** (nunca en `localStorage`); el refresh de la
  PWA viaja en la cookie `httpOnly` que ya emite el backend. Al abrir la app se
  intenta `POST /auth/refresh`; si falla, la sesión queda anónima.
- **Reintento transparente:** cualquier petición autenticada que reciba 401
  renueva y reintenta una sola vez; si el refresh falla, el usuario vuelve al
  login. Esto cubre la expiración del token a los 15 minutos.
- **El refresco de web no lleva cuerpo** (`{}`): el token va en la cookie. El
  smoke test detectó que enviar `clientType` producía 400 por la validación
  estricta del DTO; corregido antes del cierre de la fase.
- **`openapi-fetch` resuelve `fetch` en cada llamada** (`deferredFetch`), lo que
  permite que MSW intercepte en las pruebas aunque el cliente se cree antes.
- **`/verificar-correo` queda fuera de las guardas**: se puede verificar desde
  el enlace del correo con o sin sesión iniciada.
- Los formularios usan **react-hook-form + Zod** con las reglas del backend
  (contraseña ≥ 10, correo válido, confirmación).

## 4. Verificación

```powershell
npm.cmd run typecheck
npm.cmd run test
npm.cmd run lint
npm.cmd run build
```

Prueba de humo end-to-end (backend en 3000 + Vite en 5173, a través del proxy,
con `curl`):

| Paso | Resultado |
|---|---|
| `POST /auth/register` | 201, usuario `PENDING_VERIFICATION` |
| `POST /auth/login` (WEB) | 200, sin `refreshToken` en el cuerpo, `Set-Cookie` guardada |
| `POST /auth/refresh` con cookie + `Origin` | 200 y token rotado |
| `POST /auth/refresh` sin `Origin` | 403 `UNTRUSTED_ORIGIN` |
| `POST /auth/refresh` sin cookie | 401 `MISSING_REFRESH_TOKEN` |
| `POST /auth/logout` | 204 |
| `GET /users/me` con el token revocado | 401 |

## 5. Notas

- El bloqueo por intentos (423) y el límite de peticiones (429) se muestran con
  el `detail` del backend.
- La detección de `PENDING_DELETION` (solo cancelar/exportar/logout) se
  implementará junto con las pantallas de cuenta en la Fase 5.
- La Fase 3 reemplaza el inicio temporal por el layout principal (menú, tab bar
  y dashboard) e instala shadcn/ui.
