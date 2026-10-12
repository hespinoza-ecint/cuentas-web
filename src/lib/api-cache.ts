/**
 * Cache de lecturas de la API que administra el service worker
 * (ver `runtimeCaching` en vite.config.ts). Al terminar la sesión se borra
 * para que el siguiente usuario de un equipo compartido no vea datos del
 * anterior.
 */

/** Nombre de la cache de lecturas (compartido con vite.config.ts). */
export const API_READ_CACHE_NAME = 'cuentas-api-read'

/** Rutas que nunca se cachean: sesión y exportación completa de datos. */
const SENSITIVE_PREFIXES = ['/api/v1/auth/']
const SENSITIVE_PATHS = ['/api/v1/users/me/export']

/** Solo se cachean lecturas de la API que no exponen datos sensibles. */
export function isCacheableApiRead(url: URL, method: string): boolean {
  if (method !== 'GET' || !url.pathname.startsWith('/api/v1/')) {
    return false
  }
  if (SENSITIVE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    return false
  }
  return !SENSITIVE_PATHS.includes(url.pathname)
}

/** Borra la cache de lecturas de la API (se llama al terminar la sesión). */
export function purgeApiCache(): void {
  if (typeof caches === 'undefined') {
    return
  }
  void caches.delete(API_READ_CACHE_NAME)
}
