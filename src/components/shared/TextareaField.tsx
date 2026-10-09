import { useId, type ComponentProps, type ReactNode } from 'react'
import { controlClass } from '../ui/control.ts'

interface TextareaFieldProps extends ComponentProps<'textarea'> {
  label: string
  error?: string
  hint?: ReactNode
}

/** Área de texto con la misma receta visual que los demás campos. */
export function TextareaField({
  label,
  error,
  hint,
  id,
  name,
  ref,
  className,
  ...rest
}: TextareaFieldProps) {
  const generatedId = useId()
  const textareaId = id ?? name ?? generatedId
  const errorId = error ? `${textareaId}-error` : undefined

  return (
    <div className="min-w-0">
      <label htmlFor={textareaId} className="mb-1 block text-sm font-medium text-ink-secondary">
        {label}
      </label>
      <textarea
        id={textareaId}
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
