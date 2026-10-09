import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, CircleSlash, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ActionMenu } from '../../components/ui/action-menu.tsx'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { ErrorState } from '../../components/shared/ErrorState.tsx'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card, CardDescription, CardTitle } from '../../components/ui/card.tsx'
import { ConfirmDialog } from '../../components/ui/confirm-dialog.tsx'
import { EmptyState } from '../../components/ui/empty-state.tsx'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { Skeleton } from '../../components/ui/skeleton.tsx'
import { toast } from '../../lib/toast.ts'
import { formatLocalDate } from '../../lib/dates.ts'
import { listAccounts } from '../accounts/accounts-api.ts'
import { listCategories } from '../categories/categories-api.ts'
import { ConfirmIncomeDialog } from './ConfirmIncomeDialog.tsx'
import { IncomeScheduleDialog } from './IncomeScheduleDialog.tsx'
import { IncomeSourceDialog } from './IncomeSourceDialog.tsx'
import {
  listSources,
  listTransactions,
  removeSchedule,
  removeSource,
  skipIncome,
  upcomingIncome,
  type IncomeSchedule,
  type IncomeSource,
  type UpcomingIncomeItem,
} from './income-api.ts'

const STATUS_LABELS: Record<string, { label: string; tone: 'success' | 'neutral' | 'info' }> = {
  CONFIRMED: { label: 'Confirmado', tone: 'success' },
  SKIPPED: { label: 'Omitido', tone: 'neutral' },
  RESCHEDULED: { label: 'Reprogramado', tone: 'info' },
}

export function IncomePage() {
  const queryClient = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<IncomeSource | null>(null)
  const [scheduleFor, setScheduleFor] = useState<IncomeSource | null>(null)
  const [editingSchedule, setEditingSchedule] = useState<{ source: IncomeSource; schedule: IncomeSchedule } | null>(null)
  const [confirming, setConfirming] = useState<UpcomingIncomeItem | null>(null)
  const [skipping, setSkipping] = useState<UpcomingIncomeItem | null>(null)
  const [deletingSource, setDeletingSource] = useState<IncomeSource | null>(null)
  const [deletingSchedule, setDeletingSchedule] = useState<{ source: IncomeSource; schedule: IncomeSchedule } | null>(null)

  const accounts = useQuery({ queryKey: ['accounts'], queryFn: listAccounts })
  const categories = useQuery({
    queryKey: ['categories', 'INCOME'],
    queryFn: () => listCategories('INCOME'),
  })
  const sources = useQuery({ queryKey: ['income-sources'], queryFn: listSources })
  const upcoming = useQuery({
    queryKey: ['income-upcoming', 60],
    queryFn: () => upcomingIncome(60),
  })
  const transactions = useInfiniteQuery({
    queryKey: ['income-transactions'],
    queryFn: ({ pageParam }) =>
      listTransactions({ limit: 20, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  })

  const invalidateIncome = () => {
    void queryClient.invalidateQueries({ queryKey: ['income-sources'] })
    void queryClient.invalidateQueries({ queryKey: ['income-upcoming'] })
  }

  const removeSourceMutation = useMutation({
    mutationFn: removeSource,
    onSuccess: () => {
      invalidateIncome()
      toast('Fuente de ingreso eliminada con sus calendarios.')
    },
  })

  const removeScheduleMutation = useMutation({
    mutationFn: ({ source, schedule }: { source: IncomeSource; schedule: IncomeSchedule }) =>
      removeSchedule(source.id, schedule.id),
    onSuccess: () => {
      invalidateIncome()
      toast('Calendario eliminado.')
    },
  })

  const skipMutation = useMutation({
    mutationFn: (occurrence: UpcomingIncomeItem) =>
      skipIncome({
        incomeSourceId: occurrence.incomeSourceId,
        incomeScheduleId: occurrence.incomeScheduleId,
        expectedDate: occurrence.expectedDate,
      }),
    onSuccess: () => {
      toast('Fecha omitida: ya no se proyecta.')
      setSkipping(null)
      void queryClient.invalidateQueries({ queryKey: ['income-upcoming'] })
      void queryClient.invalidateQueries({ queryKey: ['income-transactions'] })
    },
    onError: () => setSkipping(null),
  })

  const occurrences = upcoming.data?.occurrences ?? []
  const sourceList = sources.data ?? []
  const history = transactions.data?.pages.flatMap((page) => page.data) ?? []
  const hasAccounts = (accounts.data ?? []).length > 0

  return (
    <div data-testid="income-page">
      <PageHeader
        title="Ingresos"
        description="Fuentes, calendarios y confirmación de depósitos"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!hasAccounts}>
            Nueva fuente
          </Button>
        }
      />

      <div className="mb-4 space-y-3">
        <ErrorAlert
          error={removeSourceMutation.error ?? removeScheduleMutation.error ?? skipMutation.error}
        />
      </div>

      <Card className="mb-5">
        <CardTitle>Próximos ingresos ({upcoming.data?.horizonDays ?? 60} días)</CardTitle>
        <CardDescription>
          Fechas ajustadas por días inhábiles y depósitos variables con factor conservador.
        </CardDescription>

        {upcoming.isPending && <Skeleton className="mt-3 h-16" />}
        {upcoming.isError && <ErrorState error={upcoming.error} onRetry={() => void upcoming.refetch()} />}
        {upcoming.data && occurrences.length === 0 && (
          <p className="mt-3 text-sm text-ink-muted">No hay ingresos próximos.</p>
        )}
        {occurrences.length > 0 && (
          <ul className="mt-3 divide-y divide-line" data-testid="income-upcoming">
            {occurrences.map((occurrence) => (
              <li
                key={`${occurrence.incomeScheduleId}-${occurrence.expectedDate}`}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
                    <span className="font-medium">{occurrence.incomeSourceName}</span>
                    {occurrence.overdue && <Badge tone="warning">Vencido</Badge>}
                    {occurrence.amountType === 'VARIABLE' && <Badge tone="info">Variable</Badge>}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {formatLocalDate(occurrence.expectedDate)}
                    {occurrence.daysUntil >= 0 ? ` · en ${occurrence.daysUntil} días` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <MoneyDisplay cents={occurrence.expectedAmount} className="font-medium text-income" />
                  <Button variant="secondary" size="sm" onClick={() => setConfirming(occurrence)}>
                    Confirmar
                  </Button>
                  <ActionMenu
                    label={`Más acciones del ingreso de ${occurrence.incomeSourceName}`}
                    items={[
                      {
                        label: 'Omitir esta fecha',
                        icon: CircleSlash,
                        onSelect: () => setSkipping(occurrence),
                      },
                    ]}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mb-5">
        <CardTitle>Fuentes y calendarios</CardTitle>
        <CardDescription>Una fuente puede tener varios calendarios (por ejemplo, sueldo y bono).</CardDescription>

        {sources.isPending && <Skeleton className="mt-3 h-20" />}
        {sources.isError && <ErrorState error={sources.error} onRetry={() => void sources.refetch()} />}
        {sources.data && sourceList.length === 0 && (
          <div className="mt-3">
            <EmptyState
              title="Sin fuentes de ingreso"
              description="Registra tu sueldo, freelance o rentas para proyectar tu flujo."
              action={
                hasAccounts ? (
                  <Button variant="secondary" onClick={() => setCreateOpen(true)}>
                    <Plus className="size-4" aria-hidden="true" />
                    Nueva fuente
                  </Button>
                ) : undefined
              }
            />
          </div>
        )}

        {sourceList.length > 0 && (
          <ul className="mt-3 space-y-2" data-testid="income-sources">
            {sourceList.map((source) => (
              <li key={source.id} className="rounded-xl border border-line bg-surface">
                <div className="flex items-start justify-between gap-2 py-2 pr-2 pl-4">
                  <button
                    type="button"
                    onClick={() => setEditingSource(source)}
                    className="min-w-0 flex-1 py-1 text-left"
                  >
                    <span className="flex flex-wrap items-center gap-2 text-sm text-ink">
                      <span className="font-medium">{source.name}</span>
                      <Badge tone={source.isActive ? 'success' : 'neutral'}>
                        {source.isActive ? 'Activa' : 'Inactiva'}
                      </Badge>
                      <Badge tone="neutral">
                        {source.amountType === 'VARIABLE' ? 'Variable' : 'Fijo'}
                      </Badge>
                      {source.category && (
                        <span className="text-xs text-ink-muted">{source.category.name}</span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-muted">
                      Estimado <MoneyDisplay cents={source.estimatedAmount} /> ·{' '}
                      {source.cashAccount?.name ?? 'cuenta'}
                      {source.payer ? ` · ${source.payer}` : ''}
                    </span>
                  </button>
                  <ActionMenu
                    label={`Más acciones de ${source.name}`}
                    items={[
                      { label: 'Editar', icon: Pencil, onSelect: () => setEditingSource(source) },
                      {
                        label: 'Agregar calendario',
                        icon: CalendarPlus,
                        onSelect: () => setScheduleFor(source),
                      },
                      {
                        label: 'Eliminar',
                        icon: Trash2,
                        tone: 'danger',
                        onSelect: () => setDeletingSource(source),
                      },
                    ]}
                  />
                </div>

                {source.schedules.length > 0 && (
                  <ul className="mt-1 space-y-1 border-t border-line px-4 py-1.5">
                    {source.schedules.map((schedule) => (
                      <li
                        key={schedule.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-1 text-xs"
                      >
                        <span className="text-ink-secondary">
                          {describeSchedule(schedule)}
                          {schedule.amountOverride ? ' · monto propio' : ''}
                          {!schedule.isActive ? ' · inactivo' : ''}
                        </span>
                        <span className="flex gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Editar calendario de ${source.name}`}
                            onClick={() => setEditingSchedule({ source, schedule })}
                          >
                            <Pencil className="size-3.5" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Eliminar calendario de ${source.name}`}
                            onClick={() => setDeletingSchedule({ source, schedule })}
                          >
                            <Trash2 className="size-3.5 text-danger" aria-hidden="true" />
                          </Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle>Historial de ingresos</CardTitle>
        <CardDescription>Confirmaciones y omisiones recientes.</CardDescription>

        {transactions.isPending && <Skeleton className="mt-3 h-16" />}
        {transactions.isError && (
          <ErrorState error={transactions.error} onRetry={() => void transactions.refetch()} />
        )}
        {transactions.data && history.length === 0 && (
          <p className="mt-3 text-sm text-ink-muted">Aún no has confirmado ingresos.</p>
        )}

        {history.length > 0 && (
          <ul className="mt-3 divide-y divide-line" data-testid="income-history">
            {history.map((entry) => {
              const status = STATUS_LABELS[entry.status] ?? { label: entry.status, tone: 'neutral' as const }
              return (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
                      <span className="font-medium">{entry.incomeSource?.name ?? 'Ingreso'}</span>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Esperado {entry.expectedDate ? formatLocalDate(entry.expectedDate) : '—'}
                      {entry.actualDate ? ` · real ${formatLocalDate(entry.actualDate)}` : ''}
                      {entry.notes ? ` · ${entry.notes}` : ''}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    {entry.actualAmount !== null && (
                      <MoneyDisplay cents={entry.actualAmount} className="font-medium text-income" />
                    )}
                    {entry.expectedAmount !== null && entry.actualAmount !== entry.expectedAmount && (
                      <p className="text-xs text-ink-muted">
                        estimado <MoneyDisplay cents={entry.expectedAmount} />
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {transactions.hasNextPage && (
          <div className="mt-3 flex justify-center">
            <Button
              variant="secondary"
              size="sm"
              loading={transactions.isFetchingNextPage}
              onClick={() => void transactions.fetchNextPage()}
            >
              {transactions.isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
            </Button>
          </div>
        )}
      </Card>

      {createOpen && (
        <IncomeSourceDialog
          accounts={accounts.data ?? []}
          categories={categories.data ?? []}
          open
          onOpenChange={setCreateOpen}
        />
      )}
      {editingSource && (
        <IncomeSourceDialog
          accounts={accounts.data ?? []}
          categories={categories.data ?? []}
          open
          onOpenChange={(open) => {
            if (!open) {
              setEditingSource(null)
            }
          }}
          editing={editingSource}
        />
      )}
      {scheduleFor && (
        <IncomeScheduleDialog
          source={scheduleFor}
          open
          onOpenChange={(open) => {
            if (!open) {
              setScheduleFor(null)
            }
          }}
        />
      )}
      {editingSchedule && (
        <IncomeScheduleDialog
          source={editingSchedule.source}
          editing={editingSchedule.schedule}
          open
          onOpenChange={(open) => {
            if (!open) {
              setEditingSchedule(null)
            }
          }}
        />
      )}
      {confirming && (
        <ConfirmIncomeDialog
          occurrence={confirming}
          open
          onOpenChange={(open) => {
            if (!open) {
              setConfirming(null)
            }
          }}
        />
      )}

      <ConfirmDialog
        open={skipping !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSkipping(null)
          }
        }}
        title="Omitir fecha estimada"
        description={
          skipping
            ? `Se omitirá el ingreso esperado del ${formatLocalDate(skipping.expectedDate)} y dejará de proyectarse.`
            : ''
        }
        confirmLabel="Omitir"
        tone="primary"
        onConfirm={async () => {
          if (skipping) {
            await skipMutation.mutateAsync(skipping)
          }
        }}
      />
      <ConfirmDialog
        open={deletingSource !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingSource(null)
          }
        }}
        title="Eliminar fuente de ingreso"
        description={
          deletingSource
            ? `Se ocultará "${deletingSource.name}" con sus calendarios. Los ingresos confirmados se conservan.`
            : ''
        }
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (deletingSource) {
            await removeSourceMutation.mutateAsync(deletingSource.id)
          }
        }}
      />
      <ConfirmDialog
        open={deletingSchedule !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingSchedule(null)
          }
        }}
        title="Eliminar calendario"
        description="El calendario dejará de generar fechas estimadas."
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (deletingSchedule) {
            await removeScheduleMutation.mutateAsync(deletingSchedule)
          }
        }}
      />
    </div>
  )
}

function describeSchedule(schedule: IncomeSchedule): string {
  const config = schedule.config ?? {}
  switch (schedule.frequency) {
    case 'WEEKLY':
      return `Semanal (día ${config.dayOfWeek ?? '—'})`
    case 'BIWEEKLY': {
      const days = Array.isArray(config.days) ? (config.days as (number | string)[]) : []
      return `Quincenal (${days.map((day) => (day === 'LAST' ? 'último' : day)).join(', ') || '—'})`
    }
    case 'MONTHLY':
      return `Mensual (día ${config.day === 'LAST' ? 'último' : (config.day ?? '—')})`
    case 'ONE_TIME':
      return `Única (${config.date ?? '—'})`
    default: {
      if (typeof config.everyNDays === 'number') {
        return `Cada ${config.everyNDays} días`
      }
      if (Array.isArray(config.daysOfMonth)) {
        return `Días ${(config.daysOfMonth as number[]).join(', ')}`
      }
      if (Array.isArray(config.specificDates)) {
        return `Fechas ${(config.specificDates as string[]).join(', ')}`
      }
      return 'Personalizada'
    }
  }
}
