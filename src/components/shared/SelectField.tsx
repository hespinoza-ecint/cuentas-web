import type { ComponentProps, ReactNode } from 'react'

interface SelectFieldProps extends ComponentProps<'select'> {
  label: string
  error?: string
  children: ReactNode
}

export function SelectField({ label, error, id, name, children, className, ...rest }: SelectFieldProps) {
  const selectId = id ?? name
  const errorId = error ? `${selectId}-error` : undefined

  return (
    <div className={className}>
      <label htmlFor={selectId} className="mb-1 block text-sm font-medium text-ink-secondary">
        {label}
      </label>
      <select
        id={selectId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`w-full rounded-lg border px-3 py-2 text-base text-ink shadow-sm outline-none transition focus:ring-2 sm:text-sm ${
          error
            ? 'border-danger focus:border-danger focus:ring-danger/25'
            : 'border-line-strong focus:border-focus focus:ring-focus/25'
        }`}
        {...rest}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
