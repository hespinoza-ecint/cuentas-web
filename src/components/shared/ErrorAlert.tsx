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
      className={`rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 ${className}`}
    >
      <p>{message}</p>
      {problem?.requestId && (
        <p className="mt-1 text-xs text-red-600">Referencia: {problem.requestId}</p>
      )}
    </div>
  )
}
