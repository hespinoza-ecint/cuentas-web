import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { ErrorState } from '../../components/shared/ErrorState.tsx'
import { ReasonDialog } from '../../components/shared/ReasonDialog.tsx'
import { SelectField } from '../../components/shared/SelectField.tsx'
import { StatusBadge } from '../../components/shared/StatusBadge.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card } from '../../components/ui/card.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../../components/ui/dialog.tsx'
import { EmptyState } from '../../components/ui/empty-state.tsx'
import { ListRow } from '../../components/ui/list-row.tsx'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { Skeleton } from '../../components/ui/skeleton.tsx'
import { toast } from '../../lib/toast.ts'
import { formatLocalDate } from '../../lib/dates.ts'
import { listAccounts } from '../accounts/accounts-api.ts'
import { listCards } from '../cards/cards-api.ts'
import { getPayment, listPayments, reversePayment, type CardPayment } from './card-payments-api.ts'
import { PaymentFormDialog } from './PaymentFormDialog.tsx'

const TYPE_LABELS: Record<string, string> = {
  STATEMENT: 'Pago de corte',
  PARTIAL: 'Pago parcial',
  INSTALLMENT_PREPAYMENT: 'Anticipo de mensualidad',
  PLAN_PAYOFF: 'Liquidación de plan',
}

const TARGET_LABELS: Record<string, string> = {
  STATEMENT: 'Corte',
  INSTALLMENT: 'Mensualidad',
  REVOLVING: 'Saldo revolvente',
}

export function CardPaymentsPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const cards = useQuery({ queryKey: ['cards'], queryFn: listCards })
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: listAccounts })

  const [cardFilter, setCardFilter] = useState('')
  // El botón "＋" del shell llega aquí con ?nuevo=1 para abrir el formulario.
  const [createOpen, setCreateOpen] = useState(() => searchParams.get('nuevo') === '1')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [reversing, setReversing] = useState<CardPayment | null>(null)

  function changeCreateOpen(open: boolean) {
    setCreateOpen(open)
    // El parámetro ya cumplió su función: se limpia de la URL.
    if (!open && searchParams.get('nuevo')) {
      setSearchParams({}, { replace: true })
    }
  }

  const payments = useInfiniteQuery({
    queryKey: ['payments', cardFilter],
    queryFn: ({ pageParam }) =>
      listPayments({
        creditCardId: cardFilter || undefined,
        limit: 20,
        cursor: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  })

  const detail = useQuery({
    queryKey: ['payment', detailId],
    queryFn: () => getPayment(detailId as string),
    enabled: detailId !== null,
  })

  const reverse = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => reversePayment(id, reason),
    onSuccess: () => {
      toast('Pago revertido: se restauraron saldos y mensualidades.')
      setReversing(null)
      void queryClient.invalidateQueries({ queryKey: ['payments'] })
      void queryClient.invalidateQueries({ queryKey: ['cards'] })
      void queryClient.invalidateQueries({ queryKey: ['statements'] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const items = payments.data?.pages.flatMap((page) => page.data) ?? []
  const cardName = new Map(
    (cards.data ?? []).map((card) => [card.id, `${card.alias} ····${card.last4}`]),
  )
  const accountName = new Map((accounts.data ?? []).map((account) => [account.id, account.name]))
  const canCreate = (cards.data ?? []).length > 0 && (accounts.data ?? []).length > 0

  return (
    <div data-testid="payments-page">
      <PageHeader
        title="Pagos de tarjeta"
        description="Pagos aplicados a mensualidades, cortes y saldo revolvente"
        actions={
          <Button size="sm" onClick={() => changeCreateOpen(true)} disabled={!canCreate}>
            Registrar pago
          </Button>
        }
      />

      <Card className="mb-4 p-4">
        <SelectField
          label="Tarjeta"
          className="sm:w-64"
          value={cardFilter}
          onChange={(event) => setCardFilter(event.target.value)}
        >
          <option value="">Todas</option>
          {(cards.data ?? []).map((card) => (
            <option key={card.id} value={card.id}>
              {card.alias} ····{card.last4}
            </option>
          ))}
        </SelectField>
      </Card>

      <ErrorAlert error={reverse.error} className="mb-4" />

      {payments.isPending && (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      )}
      {payments.isError && <ErrorState error={payments.error} onRetry={() => void payments.refetch()} />}

      {payments.data && items.length === 0 && (
        <EmptyState
          title="Sin pagos"
          description="Registra un pago para aplicarlo a tus cortes."
          action={
            canCreate ? (
              <Button variant="secondary" onClick={() => changeCreateOpen(true)}>
                Registrar pago
              </Button>
            ) : undefined
          }
        />
      )}

      {items.length > 0 && (
        <ul className="space-y-2" data-testid="payments-list">
          {items.map((payment) => (
            <ListRow
              key={payment.id}
              onOpen={() => setDetailId(payment.id)}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {cardName.get(payment.creditCardId) ?? 'Tarjeta'}
                  <Badge tone="neutral">{TYPE_LABELS[payment.type] ?? payment.type}</Badge>
                  {payment.status === 'REVERSED' ? (
                    <Badge tone="warning">Revertido</Badge>
                  ) : (
                    <StatusBadge status="PAID" />
                  )}
                </span>
              }
              subtitle={`${formatLocalDate(payment.paymentDate)} · desde ${
                accountName.get(payment.cashAccountId) ?? 'cuenta'
              }`}
              trailing={<MoneyDisplay cents={payment.amount} className="font-semibold" />}
              menu={
                payment.status !== 'REVERSED'
                  ? [
                      {
                        label: 'Revertir',
                        icon: RotateCcw,
                        onSelect: () => setReversing(payment),
                      },
                    ]
                  : undefined
              }
              menuLabel={`Más acciones del pago del ${formatLocalDate(payment.paymentDate)}`}
            />
          ))}
        </ul>
      )}

      {payments.hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="secondary"
            size="sm"
            loading={payments.isFetchingNextPage}
            onClick={() => void payments.fetchNextPage()}
          >
            {payments.isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
          </Button>
        </div>
      )}

      {createOpen && (
        <PaymentFormDialog
          cards={cards.data ?? []}
          accounts={accounts.data ?? []}
          defaultCardId={cardFilter || undefined}
          open
          onOpenChange={changeCreateOpen}
          onCreated={(allocations) => {
            const summary = allocations
              .map((allocation) => `${TARGET_LABELS[allocation.targetType] ?? allocation.targetType}`)
              .join(', ')
            toast(
              allocations.length > 0 ? `Pago aplicado a: ${summary}.` : 'Pago registrado.',
            )
          }}
        />
      )}

      <Dialog open={detailId !== null} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent>
          <DialogTitle>Detalle del pago</DialogTitle>
          <DialogDescription>
            {detail.data ? `${cardName.get(detail.data.creditCardId) ?? 'Tarjeta'} · ${formatLocalDate(detail.data.paymentDate)}` : ''}
          </DialogDescription>
          {detail.isPending && <Skeleton className="mt-4 h-16" />}
          {detail.isError && <ErrorAlert error={detail.error} className="mt-4" />}
          {detail.data && (
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-ink-muted">Monto</span>
                <MoneyDisplay cents={detail.data.amount} className="font-semibold" />
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-ink-muted">Estado</span>
                <StatusBadge status={detail.data.status === 'APPLIED' ? 'PAID' : 'REVERSED'} />
              </div>
              {detail.data.notes && (
                <p className="text-xs text-ink-muted">{detail.data.notes}</p>
              )}
              <div>
                <p className="mb-1 font-medium text-ink-secondary">Aplicación</p>
                <ul className="space-y-1 text-xs text-ink-secondary">
                  {(detail.data.allocations ?? []).map((allocation) => (
                    <li key={allocation.id} className="flex justify-between gap-3">
                      <span>{TARGET_LABELS[allocation.targetType] ?? allocation.targetType}</span>
                      <MoneyDisplay cents={allocation.amount} className="font-medium" />
                    </li>
                  ))}
                  {(detail.data.allocations ?? []).length === 0 && <li>Sin asignaciones.</li>}
                </ul>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDetailId(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReasonDialog
        open={reversing !== null}
        onOpenChange={(open) => !open && setReversing(null)}
        title="Revertir pago"
        description="Se restauran el saldo de la tarjeta, la cuenta de origen y las mensualidades pagadas."
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
