import type { ComponentProps, ReactNode } from 'react'
import { controlClass } from '../ui/control.ts'

interface SelectFieldProps extends ComponentProps<'select'> {
  label: string
  error?: string
  children: ReactNode
}

export function SelectField({
  label,
  error,
  id,
  name,
  children,
  className,
  ...rest
}: SelectFieldProps) {
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
        className={controlClass({ error: Boolean(error) })}
        {...rest}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
