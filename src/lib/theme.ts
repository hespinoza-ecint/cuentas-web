import { useSyncExternalStore } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type EffectiveTheme = 'light' | 'dark'

const STORAGE_KEY = 'cuentas.theme'
const MEDIA_QUERY = '(prefers-color-scheme: dark)'

const listeners = new Set<() => void>()
let preference: ThemePreference = readStoredPreference()

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
  } catch {
    // Sin acceso a localStorage: se usa el tema del sistema.
  }
  return 'system'
}

function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(MEDIA_QUERY).matches
}

/** Tema que se está viendo: la preferencia o, si es "system", el del sistema. */
export function effectiveTheme(value: ThemePreference = preference): EffectiveTheme {
  if (value === 'system') {
    return systemPrefersDark() ? 'dark' : 'light'
  }
  return value
}

function applyTheme(): void {
  document.documentElement.classList.toggle('dark', effectiveTheme() === 'dark')
}

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): string {
  return `${preference}:${effectiveTheme()}`
}

/**
 * Aplica el tema guardado y escucha los cambios del sistema. Se llama al
 * arrancar (también hay un script en index.html para evitar el destello).
 */
export function initTheme(): void {
  applyTheme()
  if (typeof window.matchMedia === 'function') {
    window.matchMedia(MEDIA_QUERY).addEventListener('change', () => {
      if (preference === 'system') {
        applyTheme()
        emit()
      }
    })
  }
}

export function setThemePreference(next: ThemePreference): void {
  preference = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Sin persistencia: el tema se aplica solo en esta sesión.
  }
  applyTheme()
  emit()
}

export function useTheme() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot)
  const [currentPreference, effective] = snapshot.split(':') as [ThemePreference, EffectiveTheme]

  return {
    preference: currentPreference,
    effective,
    setPreference: setThemePreference,
    toggle: () => setThemePreference(effective === 'dark' ? 'light' : 'dark'),
  }
}
