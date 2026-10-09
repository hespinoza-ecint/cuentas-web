import { TriangleAlert, WifiOff } from 'lucide-react'
import { useOnlineStatus } from '../../lib/online.ts'
import { isProblemError } from '../../lib/problem.ts'

interface ErrorAlertProps {
  error: unknown
  className?: string
}

/** Muestra un error de la API (RFC 9457) o un mensaje genérico. */
export function ErrorAlert({ error, className = '' }: ErrorAlertProps) {
  const online = useOnlineStatus()

  if (!error) {
    return null
  }

  const problem = isProblemError(error) ? error.problem : undefined
  const offline = !online && !problem
  const message = offline
    ? 'Parece que no hay conexión. Vuelve a intentarlo cuando te reconectes.'
    : (problem?.detail ?? problem?.title ?? 'Ocurrió un error inesperado. Intenta de nuevo.')

  return (
    <div
      role="alert"
      className={`flex items-start gap-2.5 rounded-lg border border-danger-line bg-danger-soft px-3 py-2.5 text-sm text-danger-ink ${className}`}
    >
      {offline ? (
        <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      ) : (
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      )}
      <div className="min-w-0">
        <p>{message}</p>
        {problem?.requestId && (
          <p className="mt-1 text-xs text-danger">Referencia: {problem.requestId}</p>
        )}
      </div>
    </div>
  )
}
