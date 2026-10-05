import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api/client.ts'
import { isProblemError, problemFrom, type ProblemError } from '../../lib/problem.ts'

interface HealthResponse {
  status: string
  version: string
  environment: string
  uptimeSeconds: number
  timestamp: string
  checks: {
    database: { status: string; latencyMs?: number }
  }
}

export function HealthPage() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: async (): Promise<HealthResponse> => {
      const { data, error, response } = await api.GET('/health')
      if (error) {
        throw problemFrom(error, response)
      }
      return data as HealthResponse
    },
  })

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h1 className="text-2xl font-semibold text-slate-900">Cuentas</h1>
        <p className="mt-1 text-sm text-slate-500">Estado del backend</p>

        {health.isPending && (
          <p className="mt-6 animate-pulse text-sm text-slate-500">Conectando…</p>
        )}

        {health.isError && (
          <ErrorBox error={health.error} onRetry={() => void health.refetch()} />
        )}

        {health.data && (
          <dl className="mt-6 space-y-2 text-sm" data-testid="health-result">
            <Row label="Estado" value={health.data.status} />
            <Row label="Versión" value={health.data.version} />
            <Row label="Entorno" value={health.data.environment} />
            <Row
              label="Base de datos"
              value={`${health.data.checks.database.status}${
                health.data.checks.database.latencyMs !== undefined
                  ? ` (${health.data.checks.database.latencyMs} ms)`
                  : ''
              }`}
            />
          </dl>
        )}
      </section>
    </main>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  )
}

function ErrorBox({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const problem = isProblemError(error) ? (error as ProblemError).problem : undefined

  return (
    <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
      <p className="text-sm font-medium text-red-800">
        {problem?.detail ?? 'No se pudo conectar con el backend.'}
      </p>
      {problem?.requestId && (
        <p className="mt-1 text-xs text-red-600">requestId: {problem.requestId}</p>
      )}
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
      >
        Reintentar
      </button>
    </div>
  )
}
