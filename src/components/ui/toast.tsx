import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { cn } from '../../lib/utils.ts'
import {
  dismissToast,
  getServerSnapshot,
  getSnapshot,
  subscribe,
  type ToastTone,
} from '../../lib/toast.ts'

/*
 * Avisos breves tras guardar ("Estado visible del sistema"): confirmación
 * inmediata sin bloquear el flujo. El contenedor se monta una sola vez en el
 * shell (ver AppShell). El estado vive en src/lib/toast.ts.
 */
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
