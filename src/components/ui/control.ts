import { cn } from '../../lib/utils.ts'

/**
 * Receta unica de los controles de formulario (input, select, textarea).
 * Todos los campos de la app comparten estas clases: borde, foco, error y
 * tamano tactil (16px en movil para que iOS no haga zoom al enfocar).
 */
export function controlClass(options: { error?: boolean; className?: string } = {}): string {
  return cn(
    'w-full rounded-lg border bg-surface px-3 py-2 text-base text-ink shadow-card outline-none transition placeholder:text-ink-muted focus:ring-2 sm:text-sm',
    options.error
      ? 'border-danger focus:border-danger focus:ring-danger/25'
      : 'border-line-strong focus:border-focus focus:ring-focus/25',
    options.className,
  )
}
