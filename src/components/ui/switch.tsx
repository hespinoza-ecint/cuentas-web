import { cn } from '../../lib/utils.ts'

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  /** Etiqueta accesible; el texto visible va fuera, junto al interruptor. */
  label: string
  disabled?: boolean
  className?: string
}

/**
 * Interruptor de encendido/apagado. A diferencia de una casilla, guarda al
 * instante (reglas, preferencias), por eso comunica el estado con color Y
 * posicion de la bolita.
 */
export function Switch({ checked, onCheckedChange, label, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-55',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex h-6 w-11 items-center rounded-full px-0.5 transition-colors',
          checked ? 'bg-brand' : 'bg-surface-strong',
        )}
      >
        <span
          className={cn(
            'size-5 rounded-full bg-surface shadow-card transition-transform',
            checked && 'translate-x-5',
          )}
        />
      </span>
    </button>
  )
}
