import { useId, type ComponentProps } from 'react'
import { cn } from '../../lib/utils.ts'

interface SegmentedFieldProps
  extends Omit<ComponentProps<'input'>, 'type' | 'value' | 'children'> {
  label: string
  options: Array<{ value: string; label: string }>
}

/**
 * Opciones excluyentes (2 a 4) a la vista y a un toque: radios nativos con
 * apariencia de control segmentado. Acepta lo que devuelve `register()`.
 */
export function SegmentedField({ label, options, name, className, ...rest }: SegmentedFieldProps) {
  const generatedName = useId()

  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="mb-1 block text-sm font-medium text-ink-secondary">{label}</legend>
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-surface-subtle p-1">
        {options.map((option) => (
          // `relative`: el radio oculto (sr-only es absoluto) se queda dentro de su opcion.
          <label key={option.value} className="relative">
            <input
              type="radio"
              name={name ?? generatedName}
              value={option.value}
              className="peer sr-only"
              {...rest}
            />
            <span className="flex min-h-11 cursor-pointer items-center justify-center rounded-md px-2 text-center text-sm font-medium text-ink-secondary transition peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-card peer-focus-visible:ring-2 peer-focus-visible:ring-focus">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
