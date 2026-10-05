import { Button } from '../ui/button.tsx'
import { ErrorAlert } from './ErrorAlert.tsx'

/** Error de una consulta con botón para reintentar. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="space-y-3">
      <ErrorAlert error={error} />
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}
