import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { ErrorState } from '../../components/shared/ErrorState.tsx'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
import { ReasonDialog } from '../../components/shared/ReasonDialog.tsx'
import { SelectField } from '../../components/shared/SelectField.tsx'
import { StatusBadge } from '../../components/shared/StatusBadge.tsx'
import { SuccessAlert } from '../../components/shared/SuccessAlert.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card, CardDescription, CardTitle } from '../../components/ui/card.tsx'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { Skeleton } from '../../components/ui/skeleton.tsx'
import { formatLocalDate } from '../../lib/dates.ts'
import { cn } from '../../lib/utils.ts'
import { CardFormDialog } from './CardFormDialog.tsx'
import { ReconcileDialog } from './ReconcileDialog.tsx'
import { StatementDetailDialog } from './StatementDetailDialog.tsx'
import {
  deleteCard,
  getCard,
  getCurrentCycle,
  listLedger,
  listStatements,
  resetCard,
  type CardStatement,
} from './cards-api.ts'

const LEDGER_TYPE_LABELS: Record<string, string> = {
  OPENING_BALANCE: 'Saldo inicial',
  PURCHASE: 'Compra',
  INSTALLMENT_PRINCIPAL: 'Mensualidad (capital)',
  INTEREST: 'Interés',
  FEE: 'Comisión',
  ANNUAL_FEE: 'Anualidad',
  PAYMENT: 'Pago',
  REFUND: 'Devolución',
  ADJUSTMENT: 'Ajuste',
  REVERSAL: 'Reverso',
}

export function CardDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const card = useQuery({ queryKey: ['card', id], queryFn: () => getCard(id) })
  const cycle = useQuery({ queryKey: ['cycle', id], queryFn: () => getCurrentCycle(id) })
  const statements = useQuery({ queryKey: ['statements', id], queryFn: () => listStatements(id) })

  const [ledgerType, setLedgerType] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [reconcileOpen, setReconcileOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [selectedStatement, setSelectedStatement] = useState<CardStatement | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const ledger = useInfiniteQuery({
    queryKey: ['ledger', id, ledgerType],
    queryFn: ({ pageParam }) =>
      listLedger(id, { type: ledgerType || undefined, limit: 20, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  })

  const reset = useMutation({
    mutationFn: (reason: string) => resetCard(id, reason),
    onSuccess: (result) => {
      setNotice(result.message)
      setResetOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['card', id] })
      void queryClient.invalidateQueries({ queryKey: ['cards'] })
      void queryClient.invalidateQueries({ queryKey: ['statements', id] })
      void queryClient.invalidateQueries({ queryKey: ['ledger', id] })
      void queryClient.invalidateQueries({ queryKey: ['cycle', id] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const remove = useMutation({
    mutationFn: (reason: string) => deleteCard(id, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cards'] })
      void navigate('/tarjetas', { replace: true })
    },
  })

  const entries = ledger.data?.pages.flatMap((page) => page.data) ?? []

  if (card.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  if (card.isError || !card.data) {
    return <ErrorState error={card.error} onRetry={() => void card.refetch()} />
  }

  const data = card.data
  const utilization = data.creditLimit > 0 ? data.currentBalance / data.creditLimit : 0

  return (
    <div data-testid="card-detail-page">
      <Link to="/tarjetas" className="mb-2 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Tarjetas
      </Link>

      <PageHeader
        title={`${data.alias} ····${data.last4}`}
        description={`${data.institution} · corta el día ${data.cutDay} · ${
          data.dueDateMode === 'FIXED_DAY'
            ? `paga el día ${data.dueDay}`
            : `paga ${data.dueDaysAfterCut} días después del corte`
        }`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setReconcileOpen(true)}>
              Conciliar
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
              Editar
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setResetOpen(true)}>
              Reiniciar
            </Button>
            <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft" onClick={() => setDeleteOpen(true)}>
              Eliminar
            </Button>
          </>
        }
      />

      <div className="mb-4 space-y-3">
        <ErrorAlert error={remove.error} />
        {notice && <SuccessAlert message={notice} />}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Saldo</CardTitle>
          <CardDescription>La deuda se calcula desde el libro de la tarjeta (RN-18)</CardDescription>
          <p className="mt-3 text-2xl font-semibold text-ink">
            <MoneyDisplay cents={data.currentBalance} />
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-strong">
            <div
              className={cn(
                'h-full rounded-full',
                utilization <= 0.3 ? 'bg-success' : utilization <= 0.5 ? 'bg-warning' : 'bg-danger',
              )}
              style={{ width: `${Math.min(utilization * 100, 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Disponible <MoneyDisplay cents={data.availableCredit} className="font-medium" /> de{' '}
            <MoneyDisplay cents={data.creditLimit} className="font-medium" /> ·{' '}
            {(utilization * 100).toFixed(1)}% utilizado · <StatusBadge status={data.status} />
          </p>
          {(data.annualFee ?? 0) > 0 && (
            <p className="mt-2 text-xs text-ink-muted">
              Anualidad <MoneyDisplay cents={data.annualFee ?? 0} className="font-medium" />
              {data.annualFeeMonth ? ` en el mes ${data.annualFeeMonth}` : ''}
            </p>
          )}
        </Card>

        <Card>
          <CardTitle>Ciclo actual</CardTitle>
          <CardDescription>Fechas calculadas con el calendario de festivos (RN-12/13)</CardDescription>
          {cycle.isPending && <Skeleton className="mt-3 h-16" />}
          {cycle.isError && <ErrorState error={cycle.error} onRetry={() => void cycle.refetch()} />}
          {cycle.data && (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Periodo</dt>
                <dd className="font-medium text-ink">
                  {formatLocalDate(cycle.data.currentPeriodStart)} → {formatLocalDate(cycle.data.nextCutDate)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Cargos del ciclo</dt>
                <dd>
                  <MoneyDisplay cents={cycle.data.cycleChargesToDate} className="font-medium" />
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Vencimiento proyectado</dt>
                <dd className="font-medium text-ink">{formatLocalDate(cycle.data.projectedDueDate)}</dd>
              </div>
            </dl>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardTitle>Estados de cuenta</CardTitle>
        <CardDescription>Los cortes se materializan al consultarlos</CardDescription>

        {statements.isPending && <Skeleton className="mt-3 h-20" />}
        {statements.isError && (
          <ErrorState error={statements.error} onRetry={() => void statements.refetch()} />
        )}
        {statements.data && statements.data.length === 0 && (
          <p className="mt-3 text-sm text-ink-muted">Aún no hay cortes generados.</p>
        )}

        {statements.data && statements.data.length > 0 && (
          <ul className="mt-3 divide-y divide-line" data-testid="statements-list">
            {statements.data.map((statement) => (
              <li key={statement.id}>
                <button
                  type="button"
                  onClick={() => setSelectedStatement(statement)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 py-2 text-left hover:bg-surface-subtle"
                >
                  <div>
                    <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
                      <span className="font-medium">Corte {formatLocalDate(statement.cutDate)}</span>
                      <StatusBadge status={statement.status} />
                      {statement.minimumPaymentReported !== null && (
                        <Badge tone="info">Montos del banco</Badge>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Vence {formatLocalDate(statement.dueDate)} · sin intereses{' '}
                      <MoneyDisplay
                        cents={statement.noInterestPaymentReported ?? statement.noInterestPaymentCalc}
                      />{' '}
                      · mínimo{' '}
                      <MoneyDisplay
                        cents={statement.minimumPaymentReported ?? statement.minimumPaymentEstimated}
                      />
                    </p>
                  </div>
                  <MoneyDisplay cents={statement.statementBalance} className="font-semibold" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle>Libro de la tarjeta</CardTitle>
            <CardDescription>Compras, mensualidades, intereses y pagos (solo inserción)</CardDescription>
          </div>
          <SelectField
            label="Tipo"
            className="w-48"
            value={ledgerType}
            onChange={(event) => setLedgerType(event.target.value)}
          >
            <option value="">Todos</option>
            {Object.entries(LEDGER_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
        </div>

        {ledger.isPending && <Skeleton className="mt-3 h-20" />}
        {ledger.isError && <ErrorState error={ledger.error} onRetry={() => void ledger.refetch()} />}
        {ledger.data && entries.length === 0 && (
          <p className="mt-3 text-sm text-ink-muted">Sin movimientos para este filtro.</p>
        )}

        {entries.length > 0 && (
          <ul className="mt-3 divide-y divide-line" data-testid="ledger-list">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
                    <Badge tone="neutral">{LEDGER_TYPE_LABELS[entry.type] ?? entry.type}</Badge>
                    <span className="font-medium">{entry.description}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">{formatLocalDate(entry.occurredOn)}</p>
                </div>
                <MoneyDisplay
                  cents={entry.amount}
                  className={cn('font-semibold', entry.amount > 0 ? 'text-expense' : 'text-income')}
                />
              </li>
            ))}
          </ul>
        )}

        {ledger.hasNextPage && (
          <div className="mt-3 flex justify-center">
            <Button
              variant="secondary"
              size="sm"
              disabled={ledger.isFetchingNextPage}
              onClick={() => void ledger.fetchNextPage()}
            >
              {ledger.isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
            </Button>
          </div>
        )}
      </Card>

      {editOpen && <CardFormDialog open editing={data} onOpenChange={setEditOpen} />}
      {reconcileOpen && (
        <ReconcileDialog
          card={data}
          open
          onOpenChange={setReconcileOpen}
          onReconciled={(difference) => {
            setNotice(
              difference === 0
                ? 'El saldo coincidía con el banco.'
                : `Saldo ajustado (diferencia de ${formatDifference(difference)}).`,
            )
            void queryClient.invalidateQueries({ queryKey: ['ledger', id] })
            void queryClient.invalidateQueries({ queryKey: ['statements', id] })
          }}
        />
      )}
      {selectedStatement && (
        <StatementDetailDialog
          cardId={id}
          statement={selectedStatement}
          open
          onOpenChange={(open) => {
            if (!open) {
              setSelectedStatement(null)
            }
          }}
        />
      )}

      <ReasonDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reiniciar tarjeta"
        description={`Se borrará todo el historial de "${data.alias}": cortes, pagos, compras y movimientos. Quedará como nueva, con saldo $0 y crédito completo. Lo ya pagado en efectivo no se devuelve y los gastos recurrentes se conservan.`}
        confirmLabel="Reiniciar tarjeta"
        pending={reset.isPending}
        onSubmit={async (reason) => {
          await reset.mutateAsync(reason)
        }}
      />

      <ReasonDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar tarjeta"
        description={`Se eliminará "${data.alias}" y TODO su historial: cortes, pagos, compras, movimientos y los gastos recurrentes configurados con ella. Lo ya pagado en efectivo no se devuelve.`}
        confirmLabel="Eliminar tarjeta"
        pending={remove.isPending}
        onSubmit={async (reason) => {
          await remove.mutateAsync(reason)
        }}
      />
    </div>
  )
}

function formatDifference(difference: number): string {
  const sign = difference > 0 ? '+' : ''
  return `${sign}${(difference / 100).toFixed(2)}`
}
