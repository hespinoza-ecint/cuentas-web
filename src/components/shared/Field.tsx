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
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:ring-2 ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
            : 'border-slate-300 focus:border-slate-500 focus:ring-slate-200'
        }`}
        {...rest}
      />
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
