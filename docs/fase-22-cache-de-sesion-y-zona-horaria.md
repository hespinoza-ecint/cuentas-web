# Fase 22 — Limpieza de caché al cerrar sesión y zona horaria segura

## 1. Objetivo

Dos correcciones de robustez detectadas al revisar la lógica del frontend:

1. En un equipo compartido, el siguiente usuario podía ver datos del anterior:
   la caché de TanStack Query no se vaciaba al terminar la sesión y el service
   worker guardaba toda lectura de la API, incluido
   `GET /users/me/export` (exportación completa de datos).
2. Una zona horaria inválida guardada en la configuración tumbaba la app al
   renderizar "hoy" (`RangeError` de `Intl`), y el formulario permitía guardar
   cualquier texto.

## 2. Cambios

| Archivo | Cambio |
|---|---|
| `lib/api-cache.ts` | Nuevo: nombre de la caché, regla `isCacheableApiRead` (excluye `/api/v1/auth/*` y `/api/v1/users/me/export`) y `purgeApiCache()` |
| `vite.config.ts` | El `runtimeCaching` del service worker usa `isCacheableApiRead` |
| `features/auth/AuthGuard.tsx` | `SessionCacheGuard`: cuando la sesión pasa a anónima (cerrar sesión, expiración o eliminación de cuenta) vacía la caché de datos y la del service worker |
| `lib/dates.ts` | Nuevos `isValidTimeZone` y `DEFAULT_TIME_ZONE`; el formateador cae a la zona por defecto si la guardada no existe |
| `features/settings/SettingsPage.tsx` | El formulario valida la zona horaria antes de guardar |
| `test/render-app.tsx` | El helper de pruebas expone el `queryClient` para inspeccionarlo |

## 3. Pruebas

```powershell
npx.cmd vitest run src/lib/api-cache.test.ts src/features/auth/session-cache.test.tsx src/lib/dates.test.ts src/features/settings/settings.test.tsx --maxWorkers=1
```

- la regla de caché excluye rutas sensibles y la purga llama a
  `caches.delete('cuentas-api-read')` (y no falla si el navegador no expone
  Cache Storage);
- cerrar sesión vacía la caché de datos y la del service worker;
- una zona inválida no truena, se muestra el aviso
  "Zona horaria no válida (ej. America/Mexico_City)" y no se llama a la API.

## 4. Compatibilidad

- Sin cambios de contrato con la API.
- El service worker conserva el modo lectura (red primero); solo deja de
  cachear rutas sensibles.
- La zona inválida de cuentas existentes se normaliza con la de defecto,
  la misma que usa el backend.
