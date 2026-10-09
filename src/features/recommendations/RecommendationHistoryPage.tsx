import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ErrorState } from '../../components/shared/ErrorState.tsx'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../components/ui/dialog.tsx'
import { EmptyState } from '../../components/ui/empty-state.tsx'
import { ListRow } from '../../components/ui/list-row.tsx'
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
              <ListRow
                key={item.id}
                onOpen={() => setDetailId(item.id)}
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge tone={outcome.tone}>{outcome.label}</Badge>
                    {item.recommendedCard
                      ? `${item.recommendedCard.alias} ····${item.recommendedCard.last4}`
                      : item.outcome === 'CASH'
                        ? 'Pagar con efectivo'
                        : 'Sin opción'}
                    <span className="text-xs font-normal text-ink-muted">
                      {TYPE_LABELS[item.requestInput.type] ?? item.requestInput.type}
                    </span>
                  </span>
                }
                subtitle={`${formatDateTime(item.createdAt)}${
                  item.score !== null ? ` · puntaje ${item.score}` : ''
                }`}
                trailing={<MoneyDisplay cents={item.requestInput.amount} className="font-medium" />}
                menuLabel={`Más acciones de la consulta del ${formatDateTime(item.createdAt)}`}
              />
            )
          })}
        </ul>
      )}

      {history.hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="secondary"
            size="sm"
            loading={history.isFetchingNextPage}
            onClick={() => void history.fetchNextPage()}
          >
            {history.isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
          </Button>
        </div>
      )}

      <Dialog open={detailId !== null} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="lg:max-w-2xl">
          <DialogTitle>Detalle de la recomendación</DialogTitle>
          <DialogDescription>
            {detail.data
              ? `${TYPE_LABELS[detail.data.requestInput.type] ?? detail.data.requestInput.type} · ${formatDateTime(detail.data.createdAt)}`
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
              <details className="mt-4 text-xs text-ink-muted">
                <summary className="cursor-pointer font-medium">Contexto y reglas guardadas</summary>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-surface-subtle p-3">
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
