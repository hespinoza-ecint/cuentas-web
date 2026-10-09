import { useId, useState } from 'react'
import { parsePesosToCents } from '../../lib/money.ts'
import { controlClass } from '../ui/control.ts'

interface MoneyInputProps {
  id?: string
  name?: string
  label: string
  error?: string
  hint?: string
  placeholder?: string
  disabled?: boolean
  /** Valor en centavos (estado del formulario). */
  valueCents: number | undefined
  onCentsChange: (cents: number | undefined) => void
  onBlur?: () => void
}

function centsToText(cents: number | undefined): string {
  return cents === undefined ? '' : (cents / 100).toFixed(2)
}

/** Campo de dinero: se captura en pesos y se emite en centavos. */
export function MoneyInput({
  id,
  name,
  label,
  error,
  hint,
  placeholder = '0.00',
  disabled,
  valueCents,
  onCentsChange,
  onBlur,
}: MoneyInputProps) {
  const generatedId = useId()
  const inputId = id ?? name ?? generatedId
  const [text, setText] = useState(() => centsToText(valueCents))
  const [lastExternal, setLastExternal] = useState(valueCents)
  const [localError, setLocalError] = useState<string | null>(null)

  // Ajuste durante el render (patrón recomendado por React): si el valor
  // externo cambió (por ejemplo, un reset del formulario), sincroniza el texto.
  if (lastExternal !== valueCents) {
    setLastExternal(valueCents)
    if ((parsePesosToCents(text) ?? undefined) !== valueCents) {
      setText(centsToText(valueCents))
    }
  }

  function handleChange(next: string) {
    setText(next)
    if (next.trim() === '') {
      setLocalError(null)
      onCentsChange(undefined)
      return
    }
    const cents = parsePesosToCents(next)
    if (cents === null) {
      setLocalError('Escribe un monto válido, por ejemplo 1,234.56')
      return
    }
    setLocalError(null)
    onCentsChange(cents)
  }

  const message = error ?? localError ?? undefined
  const errorId = message ? `${inputId}-error` : undefined

  return (
    <div className="min-w-0">
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-ink-secondary">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-muted">
          $
        </span>
        <input
          id={inputId}
          name={name}
          value={text}
          onChange={(event) => handleChange(event.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          inputMode="decimal"
          autoComplete="off"
          placeholder={placeholder}
          aria-invalid={message ? true : undefined}
          aria-describedby={errorId}
          className={controlClass({
            error: Boolean(message),
            className: 'pr-3 pl-7 tabular-nums',
          })}
        />
      </div>
      {hint && !message && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      {message && (
        <p id={errorId} role="alert" className="mt-1 text-xs font-medium text-danger">
          {message}
        </p>
      )}
    </div>
  )
}
