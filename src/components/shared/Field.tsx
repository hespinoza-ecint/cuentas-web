import type { ComponentProps, ReactNode } from 'react'

interface FieldProps extends ComponentProps<'input'> {
  label: string
  error?: string
  hint?: ReactNode
}

export function Field({ label, error, hint, id, name, ref, ...rest }: FieldProps) {
  const inputId = id ?? name
  const errorId = error ? `${inputId}-error` : undefined

  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-ink-secondary">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`w-full rounded-lg border px-3 py-2 text-base text-ink shadow-sm outline-none transition focus:ring-2 sm:text-sm ${
          error
            ? 'border-danger focus:border-danger focus:ring-danger/25'
            : 'border-line-strong focus:border-focus focus:ring-focus/25'
        }`}
        {...rest}
      />
      {hint && !error && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
