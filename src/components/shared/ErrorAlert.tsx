import { isProblemError } from '../../lib/problem.ts'

interface ErrorAlertProps {
  error: unknown
  className?: string
}

/** Muestra un error de la API (RFC 9457) o un mensaje genérico. */
export function ErrorAlert({ error, className = '' }: ErrorAlertProps) {
  if (!error) {
    return null
  }

  const problem = isProblemError(error) ? error.problem : undefined
  const message =
    problem?.detail ??
    problem?.title ??
    'Ocurrió un error inesperado. Intenta de nuevo.'

  return (
    <div
      role="alert"
      className={`rounded-lg border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger-ink ${className}`}
    >
      <p>{message}</p>
      {problem?.requestId && (
        <p className="mt-1 text-xs text-danger">Referencia: {problem.requestId}</p>
      )}
    </div>
  )
}
