import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ErrorState } from '../../components/shared/ErrorState.tsx'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card } from '../../components/ui/card.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../components/ui/dialog.tsx'
import { EmptyState } from '../../components/ui/empty-state.tsx'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { Skeleton } from '../../components/ui/skeleton.tsx'
import { formatDateTime } from '../../lib/dates.ts'
import { RecommendationResultView } from './RecommendationResultView.tsx'
import { getRecommendation, listRecommendations } from './recommendations-api.ts'

const OUTCOME_LABELS: Record<string, { label: string; tone: 'success' | 'info' | 'warning' }> = {
  CARD: { label: 'Tarjeta', tone: 'success' },
  CASH: { label: 'Efectivo', tone: 'info' },
  NONE: { label: 'Sin opción', tone: 'warning' },
}

const TYPE_LABELS: Record<string, string> = {
  REGULAR: 'Regular',
  MSI: 'MSI',
  DEFERRED_INTEREST: 'Diferida',
}

export function RecommendationHistoryPage() {
  const [detailId, setDetailId] = useState<string | null>(null)

  const history = useInfiniteQuery({
    queryKey: ['recommendations'],
    queryFn: ({ pageParam }) =>
      listRecommendations({ limit: 20, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  })

  const detail = useQuery({
    queryKey: ['recommendation', detailId],
    queryFn: () => getRecommendation(detailId as string),
    enabled: detailId !== null,
  })

  const items = history.data?.pages.flatMap((page) => page.data) ?? []

  return (
    <div data-testid="recommendation-history-page">
      <PageHeader
        title="Historial de recomendaciones"
        description="Cada consulta guarda el contexto y las reglas para reproducirla"
      />

      {history.isPending && (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      )}
      {history.isError && <ErrorState error={history.error} onRetry={() => void history.refetch()} />}
      {history.data && items.length === 0 && (
        <EmptyState
          title="Sin recomendaciones"
          description="Cuando uses el recomendador verás aquí cada consulta con su resultado."
        />
      )}

      {items.length > 0 && (
        <ul className="space-y-2" data-testid="recommendations-list">
          {items.map((item) => {
            const outcome = OUTCOME_LABELS[item.outcome] ?? { label: item.outcome, tone: 'info' as const }
            return (
              <li key={item.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <div>
                    <p className="flex flex-wrap items-center gap-2 text-sm text-slate-900">
                      <Badge tone={outcome.tone}>{outcome.label}</Badge>
                      <span className="font-medium">
                        {item.recommendedCard
                          ? `${item.recommendedCard.alias} ····${item.recommendedCard.last4}`
                          : item.outcome === 'CASH'
                            ? 'Pagar con efectivo'
                            : 'Sin opción'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {TYPE_LABELS[item.requestInput.type] ?? item.requestInput.type}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      <MoneyDisplay cents={item.requestInput.amount} /> ·{' '}
                      {formatDateTime(item.createdAt)}
                      {item.score !== null ? ` · puntaje ${item.score}` : ''}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setDetailId(item.id)}>
                    Ver detalle
                  </Button>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {history.hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="secondary"
            size="sm"
            disabled={history.isFetchingNextPage}
            onClick={() => void history.fetchNextPage()}
          >
            {history.isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
          </Button>
        </div>
      )}

      <Dialog open={detailId !== null} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="lg:max-w-2xl">
          <DialogTitle>Recomendación reproducible</DialogTitle>
          <DialogDescription>
            {detail.data
              ? `${TYPE_LABELS[detail.data.requestInput.type] ?? detail.data.requestInput.type} · motor ${detail.data.engineVersion}`
              : 'Cargando…'}
          </DialogDescription>

          {detail.isPending && <Skeleton className="mt-4 h-32" />}
          {detail.isError && (
            <div className="mt-4">
              <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
            </div>
          )}
          {detail.data && (
            <div className="mt-4">
              <RecommendationResultView result={detail.data.result} />
              <details className="mt-4 text-xs text-slate-500">
                <summary className="cursor-pointer font-medium">Contexto y reglas guardadas</summary>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-50 p-3">
                  {JSON.stringify(
                    {
                      request: detail.data.requestInput,
                      context: detail.data.contextSnapshot,
                      rules: detail.data.rulesSnapshot,
                    },
                    null,
                    2,
                  )}
                </pre>
              </details>
            </div>
          )}

          <DialogFooter>
            <Button variant="secondary" onClick={() => setDetailId(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
