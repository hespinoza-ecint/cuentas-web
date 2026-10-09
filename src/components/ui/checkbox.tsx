import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/utils.ts'

interface CheckboxProps extends ComponentProps<'input'> {
  label: ReactNode
  /** Alinea la casilla con la primera linea de un texto largo. */
  alignTop?: boolean
}

/**
 * Casilla de verificacion con etiqueta tocable: toda la fila es el objetivo
 * tactil (minimo 44px de alto), no solo el cuadro de 20px.
 */
export function Checkbox({ label, alignTop = false, className, ...props }: CheckboxProps) {
  return (
    <label
      className={cn(
        'flex min-h-11 cursor-pointer items-center gap-3 py-2 text-sm text-ink-secondary',
        alignTop && 'items-start gap-2.5',
      )}
    >
      <input
        type="checkbox"
        className={cn('size-5 shrink-0 rounded accent-brand', alignTop && 'mt-0.5', className)}
        {...props}
      />
      <span className="min-w-0">{label}</span>
    </label>
  )
}
