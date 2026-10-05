import { useMutation } from '@tanstack/react-query'
import { Wrench } from 'lucide-react'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card, CardDescription, CardTitle } from '../../components/ui/card.tsx'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { formatDateTime } from '../../lib/dates.ts'
import { runMaintenance } from './admin-api.ts'

export function MaintenancePage() {
  const run = useMutation({ mutationFn: runMaintenance })

  return (
    <div data-testid="maintenance-page">
      <PageHeader
        title="Mantenimiento"
        description="Purga cuentas eliminadas hace más de 30 días y limpia sesiones, tokens e idempotencia vencidos"
      />

      <Card>
        <CardTitle>Ejecutar limpieza ahora</CardTitle>
        <CardDescription>
          El mismo proceso corre a diario a las 03:00 (hora del servidor). Es seguro ejecutarlo
          manualmente.
        </CardDescription>
        <div className="mt-4">
          <Button
            onClick={() => run.mutate()}
            disabled={run.isPending}
          >
            <Wrench className="size-4" aria-hidden="true" />
            {run.isPending ? 'Ejecutando…' : 'Ejecutar mantenimiento'}
          </Button>
        </div>

        <ErrorAlert error={run.error} className="mt-4" />

        {run.data && (
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4" data-testid="maintenance-result">
            <Metric label="Sesiones eliminadas" value={run.data.sessionsDeleted} />
            <Metric label="Tokens eliminados" value={run.data.tokensDeleted} />
            <Metric label="Idempotencia" value={run.data.idempotencyDeleted} />
            <Metric label="Cuentas purgadas" value={run.data.usersPurged} />
            <p className="col-span-2 text-xs text-slate-500 sm:col-span-4">
              Ejecutado {formatDateTime(run.data.ranAt)}
            </p>
          </dl>
        )}
      </Card>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-lg font-semibold text-slate-900">{value}</dd>
    </div>
  )
}
