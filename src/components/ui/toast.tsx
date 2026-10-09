import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { cn } from '../../lib/utils.ts'

export type ToastTone = 'success' | 'danger' | 'info'

interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

/*
 * Avisos breves tras guardar ("Estado visible del sistema"): confirmación
 * inmediata sin bloquear el flujo. Almacén mínimo sin dependencias, montado
 * una sola vez en el shell (ver Toaster).
 */
let toasts: ToastItem[] = []
const listeners = new Set<() => void>()
let nextId = 1

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
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

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): ToastItem[] {
  return toasts
}

function getServerSnapshot(): ToastItem[] {
  return []
}

const TONES: Record<ToastTone, { box: string; icon: typeof Info }> = {
  success: { box: 'border-success-line bg-success-soft text-success-ink', icon: CheckCircle2 },
  danger: { box: 'border-danger-line bg-danger-soft text-danger-ink', icon: TriangleAlert },
  info: { box: 'border-info-line bg-info-soft text-info-ink', icon: Info },
}

/** Contenedor de avisos. Se monta una vez, encima de la barra inferior. */
export function Toaster() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 px-4 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:pb-6"
    >
      {items.map((item) => {
        const tone = TONES[item.tone]
        const Icon = tone.icon
        return (
          <div
            key={item.id}
            role={item.tone === 'danger' ? 'alert' : 'status'}
            className={cn(
              'toast-enter pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm shadow-menu',
              tone.box,
            )}
          >
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1">{item.message}</p>
            <button
              type="button"
              aria-label="Cerrar aviso"
              onClick={() => dismissToast(item.id)}
              className="-m-1 shrink-0 rounded-lg p-1 opacity-70 transition hover:opacity-100"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
