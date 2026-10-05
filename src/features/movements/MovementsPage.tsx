import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { ErrorState } from '../../components/shared/ErrorState.tsx'
import { Field } from '../../components/shared/Field.tsx'
import { ReasonDialog } from '../../components/shared/ReasonDialog.tsx'
import { SelectField } from '../../components/shared/SelectField.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card } from '../../components/ui/card.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../../components/ui/dialog.tsx'
import { EmptyState } from '../../components/ui/empty-state.tsx'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { Skeleton } from '../../components/ui/skeleton.tsx'
import { formatDateTime, formatLocalDate } from '../../lib/dates.ts'
import { listAccounts } from '../accounts/accounts-api.ts'
import { AdjustmentDialog } from './AdjustmentDialog.tsx'
import { listMovements, reverseMovement, type CashMovement } from './movements-api.ts'

const TYPE_LABELS: Record<string, string> = {
  OPENING_BALANCE: 'Saldo inicial',
  INCOME: 'Ingreso',
  EXPENSE: 'Gasto',
  CARD_PAYMENT: 'Pago de tarjeta',
  ADJUSTMENT: 'Ajuste',
  TRANSFER_IN: 'Transferencia recibida',
  TRANSFER_OUT: 'Transferencia enviada',
  REVERSAL: 'Reverso',
}

const FILTER_TYPES = [
  'OPENING_BALANCE',
  'INCOME',
  'EXPENSE',
  'CARD_PAYMENT',
  'ADJUSTMENT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'REVERSAL',
]

export function MovementsPage() {
  const queryClient = useQueryClient()
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: listAccounts })

  const [accountId, setAccountId] = useState('')
  const [type, setType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [detail, setDetail] = useState<CashMovement | null>(null)
  const [reversing, setReversing] = useState<CashMovement | null>(null)

  const filters = {
    cashAccountId: accountId || undefined,
    type: type || undefined,
    from: from || undefined,
    to: to || undefined,
  }
  const hasFilters = Boolean(accountId || type || from || to)

  const movements = useInfiniteQuery({
    queryKey: ['movements', filters],
    queryFn: ({ pageParam }) =>
      listMovements({ ...filters, limit: 20, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  })

  const reverse = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => reverseMovement(id, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['movements'] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setReversing(null)
    },
  })

  const items = movements.data?.pages.flatMap((page) => page.data) ?? []
  const reversedIds = new Set(
    items
      .map((movement) => movement.reversesMovementId)
      .filter((id): id is string => id !== null),
  )
  const accountName = new Map((accounts.data ?? []).map((account) => [account.id, account.name]))

  return (
    <div data-testid="movements-page">
      <PageHeader
        title="Movimientos"
        description="Libro de efectivo: cada saldo viene de aquí (RN-05)"
        actions={
          <Button size="sm" onClick={() => setAdjustOpen(true)} disabled={(accounts.data ?? []).length === 0}>
            Ajuste manual
          </Button>
        }
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField label="Cuenta" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Todas</option>
            {(accounts.data ?? []).map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Tipo" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Todos</option>
            {FILTER_TYPES.map((value) => (
              <option key={value} value={value}>
                {TYPE_LABELS[value]}
              </option>
            ))}
          </SelectField>
          <Field label="Desde" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Field label="Hasta" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() => {
              setAccountId('')
              setType('')
              setFrom('')
              setTo('')
            }}
          >
            Limpiar filtros
          </Button>
        )}
      </Card>

      <ErrorAlert error={reverse.error} className="mb-4" />

      {movements.isPending && (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      )}
      {movements.isError && (
        <ErrorState error={movements.error} onRetry={() => void movements.refetch()} />
      )}

      {movements.data && items.length === 0 && (
        <EmptyState
          title="Sin movimientos"
          description="Ajusta los filtros o registra tu primer movimiento con un ajuste o saldo inicial."
        />
      )}

      {items.length > 0 && (
        <ul className="space-y-2" data-testid="movements-list">
          {items.map((movement) => (
            <li key={movement.id}>
              <Card className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm text-slate-900">
                    <Badge tone={movement.amount >= 0 ? 'success' : 'neutral'}>
                      {TYPE_LABELS[movement.type] ?? movement.type}
                    </Badge>
                    <span className="font-medium">{movement.description}</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatLocalDate(movement.occurredOn)}
                    {accountName.get(movement.cashAccountId)
                      ? ` · ${accountName.get(movement.cashAccountId)}`
                      : ''}
                    {movement.reason ? ` · ${movement.reason}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <MoneyDisplay cents={movement.amount} colored className="font-semibold" />
                  <Button variant="ghost" size="sm" onClick={() => setDetail(movement)}>
                    Detalle
                  </Button>
                  {movement.type !== 'REVERSAL' && !reversedIds.has(movement.id) && (
                    <Button variant="secondary" size="sm" onClick={() => setReversing(movement)}>
                      Revertir
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {movements.hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="secondary"
            size="sm"
            disabled={movements.isFetchingNextPage}
            onClick={() => void movements.fetchNextPage()}
          >
            {movements.isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
          </Button>
        </div>
      )}

      {adjustOpen && (
        <AdjustmentDialog
          accounts={accounts.data ?? []}
          open
          onOpenChange={setAdjustOpen}
        />
      )}

      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent>
          <DialogTitle>Detalle del movimiento</DialogTitle>
          <DialogDescription>{detail?.id}</DialogDescription>
          {detail && (
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Tipo" value={TYPE_LABELS[detail.type] ?? detail.type} />
              <Row label="Monto" value={<MoneyDisplay cents={detail.amount} colored />} />
              <Row label="Fecha" value={formatLocalDate(detail.occurredOn)} />
              <Row label="Descripción" value={detail.description} />
              {detail.reason && <Row label="Motivo" value={detail.reason} />}
              {detail.sourceType && <Row label="Origen" value={detail.sourceType} />}
              <Row label="Registrado" value={formatDateTime(detail.createdAt)} />
            </dl>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDetail(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReasonDialog
        open={reversing !== null}
        onOpenChange={(open) => !open && setReversing(null)}
        title="Revertir movimiento"
        description={
          reversing
            ? `Se creará el movimiento inverso de "${reversing.description}" (${formatLocalDate(reversing.occurredOn)}).`
            : ''
        }
        confirmLabel="Revertir"
        pending={reverse.isPending}
        onSubmit={async (reason) => {
          if (reversing) {
            await reverse.mutateAsync({ id: reversing.id, reason })
          }
        }}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  )
}
