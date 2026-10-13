import type { components } from '../api/schema.ts'

export type AuthUser = components['schemas']['UserResponseDto']

export interface AuthSession {
  accessToken: string
  user: AuthUser
}

export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous'

type RefreshFn = () => Promise<AuthSession | null>

/**
 * Sesión en memoria: el access token nunca se guarda en localStorage.
 * Al abrir la app se recupera con POST /auth/refresh (cookie httpOnly).
 */
let session: AuthSession | null = null
let status: SessionStatus = 'unknown'
/**
 * `performRefresh` devuelve la sesión renovada, `null` si el servidor la
 * rechazó (401) o lanza si el fallo es transitorio (sin red, 5xx, 429): en ese
 * caso la sesión actual se conserva.
 */
let performRefresh: RefreshFn = async () => null
let refreshInFlight: Promise<boolean> | null = null
let bootstrapInFlight: Promise<void> | null = null

const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getStatus(): SessionStatus {
  return status
}

export function getSession(): AuthSession | null {
  return session
}

export function getSessionUser(): AuthUser | null {
  return session?.user ?? null
}

export function getAccessToken(): string | null {
  return session?.accessToken ?? null
}

export function setSession(next: AuthSession): void {
  session = next
  status = 'authenticated'
  emit()
}

/** Actualiza los datos del usuario (por ejemplo, tras editar el perfil). */
export function setSessionUser(user: AuthUser): void {
  if (!session) {
    return
  }
  session = { ...session, user }
  emit()
}

export function clearSession(): void {
  session = null
  status = 'anonymous'
  emit()
}

export type SessionEndReason = 'expired' | 'logout' | null

let sessionEndReason: SessionEndReason = null

/** El usuario eligió cerrar sesión (motivo por defecto). */
export function clearSessionByLogout(): void {
  sessionEndReason = null
  clearSession()
}

/** La sesión murió sin que el usuario lo pidiera: avisar en la pantalla de acceso. */
export function clearSessionExpired(): void {
  sessionEndReason = 'expired'
  clearSession()
}

/**
 * Motivo por el que terminó la última sesión. Se consume una sola vez para
 * avisar en la pantalla de acceso ("Tu sesión expiró").
 */
export function consumeSessionEndReason(): SessionEndReason {
  const reason = sessionEndReason
  sessionEndReason = null
  return reason
}

/** El cliente de la API registra aquí su llamada real de refresh. */
export function configureSessionRefresh(fn: RefreshFn): void {
  performRefresh = fn
}

/**
 * Renueva la sesión. Varias peticiones que reciban 401 al mismo tiempo
 * comparten una sola llamada de red (single-flight) y, entre pestañas, se
 * serializa con `navigator.locks` cuando el navegador lo expone.
 */
export function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const next = await performRefreshWithLock()
        if (next) {
          setSession(next)
          return true
        }
        // null = el servidor rechazó la sesión (401): sí expiró.
        clearSessionExpired()
        return false
      } catch {
        // Fallo transitorio (sin red, 5xx, 429): la sesión activa se conserva.
        if (status === 'unknown') {
          // Arranque sin red: no hay sesión que conservar ni motivo que mostrar.
          clearSessionByLogout()
        }
        return false
      }
    })().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

/** Lo único que se usa de `navigator.locks` (tiparlo aquí evita ambigüedades de lib.dom). */
interface SessionRefreshLockManager {
  request(name: string, callback: () => Promise<AuthSession | null>): Promise<AuthSession | null>
}

/** Serializa la renovación entre pestañas cuando `navigator.locks` existe. */
function performRefreshWithLock(): Promise<AuthSession | null> {
  const locks =
    typeof navigator !== 'undefined'
      ? (navigator as unknown as { locks?: SessionRefreshLockManager }).locks
      : undefined
  if (!locks) {
    return performRefresh()
  }
  return locks.request('cuentas-session-refresh', () => performRefresh())
}

/** Intento inicial de sesión al abrir la app (una sola vez). */
export function bootstrapSession(): Promise<void> {
  if (status !== 'unknown') {
    return Promise.resolve()
  }
  if (!bootstrapInFlight) {
    bootstrapInFlight = refreshSession()
      .then(() => undefined)
      .finally(() => {
        bootstrapInFlight = null
      })
  }
  return bootstrapInFlight
}

/** Solo para pruebas: deja el estado como recién arrancado. */
export function resetSessionState(): void {
  session = null
  status = 'unknown'
  sessionEndReason = null
  refreshInFlight = null
  bootstrapInFlight = null
  emit()
}
