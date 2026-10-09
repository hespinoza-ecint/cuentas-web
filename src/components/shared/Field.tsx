import { useId, type ComponentProps, type ReactNode } from 'react'
import { controlClass } from '../ui/control.ts'

interface FieldProps extends ComponentProps<'input'> {
  label: string
  error?: string
  hint?: ReactNode
}

/** Campo de texto con etiqueta visible, ayuda y error junto al campo. */
export function Field({ label, error, hint, id, name, ref, className, ...rest }: FieldProps) {
  const generatedId = useId()
  const inputId = id ?? name ?? generatedId
  const errorId = error ? `${inputId}-error` : undefined

  return (
    <div className="min-w-0">
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-ink-secondary">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={controlClass({ error: Boolean(error), className })}
        {...rest}
      />
      {hint && !error && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
