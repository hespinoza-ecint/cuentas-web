import { RotateCcw } from 'lucide-react'
import { Button } from '../ui/button.tsx'
import { ErrorAlert } from './ErrorAlert.tsx'

/** Error de una consulta con botón para reintentar (nunca deja al usuario atorado). */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="space-y-3">
      <ErrorAlert error={error} />
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reintentar
        </Button>
      )}
    </div>
  )
}
