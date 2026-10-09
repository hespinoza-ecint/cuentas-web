/*
 * Tienda de avisos breves (sin dependencias). El componente que los pinta
 * vive en components/ui/toast.tsx; aquí queda el estado para poder disparar
 * avisos desde cualquier parte sin acoplarse a React.
 */
export type ToastTone = 'success' | 'danger' | 'info'

export interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

let toasts: ToastItem[] = []
const listeners = new Set<() => void>()
let nextId = 1

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

export function getSnapshot(): ToastItem[] {
  return toasts
}

export function getServerSnapshot(): ToastItem[] {
  return []
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((item) => item.id !== id)
  emit()
}

/** Muestra un aviso breve. Se retira solo (los errores tardan más). */
export function toast(
  message: string,
  options: { tone?: ToastTone; duration?: number } = {},
): number {
  const item: ToastItem = { id: nextId++, message, tone: options.tone ?? 'success' }
  // Máximo 3 avisos; el más viejo cede su lugar.
  toasts = [...toasts.slice(-2), item]
  emit()
  const duration = options.duration ?? (item.tone === 'danger' ? 6000 : 3500)
  window.setTimeout(() => dismissToast(item.id), duration)
  return item.id
}
