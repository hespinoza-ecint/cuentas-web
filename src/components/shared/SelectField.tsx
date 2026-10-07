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
      <label htmlFor={selectId} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={selectId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`w-full rounded-lg border px-3 py-2 text-base text-slate-900 shadow-sm outline-none transition focus:ring-2 sm:text-sm ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
            : 'border-slate-300 focus:border-slate-500 focus:ring-slate-200'
        }`}
        {...rest}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
