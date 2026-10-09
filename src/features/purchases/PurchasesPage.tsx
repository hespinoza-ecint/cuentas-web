import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { ErrorState } from '../../components/shared/ErrorState.tsx'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
import { ReasonDialog } from '../../components/shared/ReasonDialog.tsx'
import { SelectField } from '../../components/shared/SelectField.tsx'
import { StatusBadge } from '../../components/shared/StatusBadge.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button.tsx'
import { EmptyState } from '../../components/ui/empty-state.tsx'
import { FiltersCard } from '../../components/ui/filters-card.tsx'
import { ListRow } from '../../components/ui/list-row.tsx'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { Skeleton } from '../../components/ui/skeleton.tsx'
import { toast } from '../../lib/toast.ts'
import { formatLocalDate } from '../../lib/dates.ts'
import { formatCents } from '../../lib/money.ts'
import { listAccounts } from '../accounts/accounts-api.ts'
import { listCards } from '../cards/cards-api.ts'
import { listCategories } from '../categories/categories-api.ts'
import { PurchaseDetailDialog } from './PurchaseDetailDialog.tsx'
import { PurchaseFormDialog } from './PurchaseFormDialog.tsx'
import { cancelPurchase, deletePurchase, listPurchases, type Purchase } from './purchases-api.ts'

const TYPE_LABELS: Record<string, string> = {
  REGULAR: 'Regular',
  MSI: 'MSI',
  DEFERRED_INTEREST: 'Diferida',
}

export function PurchasesPage() {
  const queryClient = useQueryClient()
  const cards = useQuery({ queryKey: ['cards'], queryFn: listCards })
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: listAccounts })
  const categories = useQuery({
    queryKey: ['categories', 'EXPENSE'],
    queryFn: () => listCategories('EXPENSE'),
  })

  const [cardFilter, setCardFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<Purchase | null>(null)
  const [deleting, setDeleting] = useState<Purchase | null>(null)

  const purchases = useInfiniteQuery({
    queryKey: ['purchases', cardFilter, typeFilter, statusFilter],
    queryFn: ({ pageParam }) =>
      listPurchases({
        creditCardId: cardFilter || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        limit: 20,
        cursor: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  })

  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => cancelPurchase(id, reason),
    onSuccess: () => {
      toast('Compra cancelada: se restauró el crédito disponible.')
      setCancelling(null)
      void queryClient.invalidateQueries({ queryKey: ['purchases'] })
      void queryClient.invalidateQueries({ queryKey: ['cards'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const remove = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => deletePurchase(id, reason),
    onSuccess: (result) => {
      toast(
        result.refundedPrincipal > 0
          ? `Compra eliminada: se descontaron ${formatCents(result.refundedPrincipal)} del saldo de la tarjeta.`
          : 'Compra eliminada: no quedaba saldo pendiente en la tarjeta.',
      )
      setDeleting(null)
      void queryClient.invalidateQueries({ queryKey: ['purchases'] })
      void queryClient.invalidateQueries({ queryKey: ['cards'] })
      void queryClient.invalidateQueries({ queryKey: ['statements'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const items = purchases.data?.pages.flatMap((page) => page.data) ?? []
  const hasCards = (cards.data ?? []).length > 0

  return (
    <div data-testid="purchases-page">
      <PageHeader
        title="Compras"
        description="Regulares, meses sin intereses y diferidas"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!hasCards}>
            Registrar compra
          </Button>
        }
      />

      <FiltersCard activeCount={[cardFilter, typeFilter, statusFilter].filter(Boolean).length}>
        <div className="grid gap-3 sm:grid-cols-3">
          <SelectField label="Tarjeta" value={cardFilter} onChange={(event) => setCardFilter(event.target.value)}>
            <option value="">Todas</option>
            {(cards.data ?? []).map((card) => (
              <option key={card.id} value={card.id}>
                {card.alias} ····{card.last4}
              </option>
            ))}
          </SelectField>
          <SelectField label="Tipo" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="">Todos</option>
            <option value="REGULAR">Regular</option>
            <option value="MSI">MSI</option>
            <option value="DEFERRED_INTEREST">Diferida</option>
          </SelectField>
          <SelectField label="Estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Todos</option>
            <option value="ACTIVE">Activa</option>
            <option value="PAID">Pagada</option>
            <option value="CANCELLED">Cancelada</option>
            <option value="REFUNDED">Devuelta</option>
          </SelectField>
        </div>
      </FiltersCard>

      <ErrorAlert error={cancel.error ?? remove.error} className="mb-4" />

      {purchases.isPending && (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      )}
      {purchases.isError && (
        <ErrorState error={purchases.error} onRetry={() => void purchases.refetch()} />
      )}

      {purchases.data && items.length === 0 && (
        <EmptyState
          title="Sin compras"
          description="Registra una compra para dar seguimiento a sus mensualidades."
          action={
            hasCards ? (
              <Button variant="secondary" onClick={() => setCreateOpen(true)}>
                Registrar compra
              </Button>
            ) : undefined
          }
        />
      )}

      {items.length > 0 && (
        <ul className="space-y-2" data-testid="purchases-list">
          {items.map((purchase) => {
            const nextInstallment = purchase.installmentPlan?.installments.find(
              (installment) => installment.status !== 'PAID',
            )
            const hasPayments =
              purchase.installmentPlan?.installments.some(
                (installment) => installment.paidAmount > 0,
              ) ?? false
            const canCancel = purchase.status === 'ACTIVE' && !hasPayments
            const menu = []
            if (canCancel) {
              menu.push({
                label: 'Cancelar',
                icon: Ban,
                onSelect: () => setCancelling(purchase),
              })
            }
            menu.push({
              label: 'Eliminar',
              icon: Trash2,
              tone: 'danger' as const,
              onSelect: () => setDeleting(purchase),
            })
            return (
              <ListRow
                key={purchase.id}
                onOpen={() => setDetailId(purchase.id)}
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    {purchase.description}
                    <Badge tone="neutral">{TYPE_LABELS[purchase.type] ?? purchase.type}</Badge>
                    <StatusBadge status={purchase.status} />
                  </span>
                }
                subtitle={[
                  purchase.creditCard
                    ? `${purchase.creditCard.alias} ····${purchase.creditCard.last4}`
                    : undefined,
                  formatLocalDate(purchase.purchaseDate),
                  nextInstallment
                    ? `próxima #${nextInstallment.number} por ${(nextInstallment.totalAmount / 100).toFixed(2)} el ${formatLocalDate(nextInstallment.dueDate)}`
                    : undefined,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                trailing={<MoneyDisplay cents={purchase.amount} className="font-semibold" />}
                menu={menu}
                menuLabel={`Más acciones de ${purchase.description}`}
              />
            )
          })}
        </ul>
      )}

      {purchases.hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="secondary"
            size="sm"
            loading={purchases.isFetchingNextPage}
            onClick={() => void purchases.fetchNextPage()}
          >
            {purchases.isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
          </Button>
        </div>
      )}

      {createOpen && (
        <PurchaseFormDialog
          cards={cards.data ?? []}
          categories={categories.data ?? []}
          open
          onOpenChange={setCreateOpen}
        />
      )}

      {detailId && (
        <PurchaseDetailDialog
          purchaseId={detailId}
          accounts={accounts.data ?? []}
          open
          onOpenChange={(open) => {
            if (!open) {
              setDetailId(null)
            }
          }}
          onCancelRequest={(purchase) => {
            setDetailId(null)
            setCancelling(purchase)
          }}
          onDeleteRequest={(purchase) => {
            setDetailId(null)
            setDeleting(purchase)
          }}
        />
      )}

      <ReasonDialog
        open={cancelling !== null}
        onOpenChange={(open) => !open && setCancelling(null)}
        title="Cancelar compra"
        description={
          cancelling
            ? `Se cancelará "${cancelling.description}" y se restaurará el crédito. Solo si ninguna mensualidad tiene pagos.`
            : ''
        }
        confirmLabel="Cancelar compra"
        pending={cancel.isPending}
        onSubmit={async (reason) => {
          if (cancelling) {
            await cancel.mutateAsync({ id: cancelling.id, reason })
          }
        }}
      />

      <ReasonDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Eliminar compra"
        description={deleting ? deleteDescription(deleting) : ''}
        confirmLabel="Eliminar compra"
        pending={remove.isPending}
        onSubmit={async (reason) => {
          if (deleting) {
            await remove.mutateAsync({ id: deleting.id, reason })
          }
        }}
      />
    </div>
  )
}

/** Mensaje del diálogo de eliminación, con el ajuste que se hará en la tarjeta. */
function deleteDescription(purchase: Purchase): string {
  if (purchase.status === 'CANCELLED' || purchase.status === 'REFUNDED') {
    return `Se borrará "${purchase.description}" del historial; su cancelación anterior ya había revertido el cargo en la tarjeta.`
  }
  if (purchase.installmentPlan) {
    const pending = purchase.installmentPlan.outstandingPrincipal
    const base = `Se eliminará "${purchase.description}" del historial; sus mensualidades pendientes quedan canceladas y lo ya pagado no se modifica.`
    return purchase.type === 'MSI' && pending > 0
      ? `${base} Se descontarán ${formatCents(pending)} del saldo de la tarjeta.`
      : base
  }
  return `Se eliminará "${purchase.description}" del historial y se revertirá su cargo en la tarjeta hasta donde alcance la deuda actual. Lo ya pagado no se devuelve.`
}
