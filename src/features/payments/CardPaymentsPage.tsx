import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { ErrorState } from '../../components/shared/ErrorState.tsx'
import { ReasonDialog } from '../../components/shared/ReasonDialog.tsx'
import { SelectField } from '../../components/shared/SelectField.tsx'
import { StatusBadge } from '../../components/shared/StatusBadge.tsx'
import { SuccessAlert } from '../../components/shared/SuccessAlert.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card } from '../../components/ui/card.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../../components/ui/dialog.tsx'
import { EmptyState } from '../../components/ui/empty-state.tsx'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { Skeleton } from '../../components/ui/skeleton.tsx'
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
  const cards = useQuery({ queryKey: ['cards'], queryFn: listCards })
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: listAccounts })

  const [cardFilter, setCardFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [reversing, setReversing] = useState<CardPayment | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

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
      setNotice('Pago revertido: se restauraron saldos y mensualidades.')
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

  return (
    <div data-testid="payments-page">
      <PageHeader
        title="Pagos de tarjeta"
        description="Pagos aplicados a mensualidades, cortes y saldo revolvente"
        actions={
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            disabled={(cards.data ?? []).length === 0 || (accounts.data ?? []).length === 0}
          >
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

      <div className="mb-4 space-y-3">
        <ErrorAlert error={reverse.error} />
        {notice && <SuccessAlert message={notice} />}
      </div>

      {payments.isPending && (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      )}
      {payments.isError && <ErrorState error={payments.error} onRetry={() => void payments.refetch()} />}

      {payments.data && items.length === 0 && (
        <EmptyState title="Sin pagos" description="Registra un pago para aplicarlo a tus cortes." />
      )}

      {items.length > 0 && (
        <ul className="space-y-2" data-testid="payments-list">
          {items.map((payment) => (
            <li key={payment.id}>
              <Card className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
                      <span className="font-medium">{cardName.get(payment.creditCardId) ?? 'Tarjeta'}</span>
                      <Badge tone="neutral">{TYPE_LABELS[payment.type] ?? payment.type}</Badge>
                      {payment.status === 'REVERSED' ? (
                        <Badge tone="warning">Revertido</Badge>
                      ) : (
                        <StatusBadge status="PAID" />
                      )}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {formatLocalDate(payment.paymentDate)} · desde {accountName.get(payment.cashAccountId) ?? 'cuenta'}
                    </p>
                  </div>
                  <MoneyDisplay cents={payment.amount} className="shrink-0 font-semibold" />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setDetailId(payment.id)}>
                    Detalle
                  </Button>
                  {payment.status !== 'REVERSED' && (
                    <Button variant="secondary" size="sm" onClick={() => setReversing(payment)}>
                      Revertir
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {payments.hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="secondary"
            size="sm"
            disabled={payments.isFetchingNextPage}
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
          onOpenChange={setCreateOpen}
          onCreated={(allocations) => {
            const summary = allocations
              .map((allocation) => `${TARGET_LABELS[allocation.targetType] ?? allocation.targetType}`)
              .join(', ')
            setNotice(
              allocations.length > 0
                ? `Pago aplicado a: ${summary}.`
                : 'Pago registrado.',
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
