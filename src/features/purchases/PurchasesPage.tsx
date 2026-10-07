import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { ErrorState } from '../../components/shared/ErrorState.tsx'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
import { ReasonDialog } from '../../components/shared/ReasonDialog.tsx'
import { SelectField } from '../../components/shared/SelectField.tsx'
import { StatusBadge } from '../../components/shared/StatusBadge.tsx'
import { SuccessAlert } from '../../components/shared/SuccessAlert.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card } from '../../components/ui/card.tsx'
import { EmptyState } from '../../components/ui/empty-state.tsx'
import { FiltersCard } from '../../components/ui/filters-card.tsx'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { Skeleton } from '../../components/ui/skeleton.tsx'
import { formatLocalDate } from '../../lib/dates.ts'
import { listAccounts } from '../accounts/accounts-api.ts'
import { listCards } from '../cards/cards-api.ts'
import { listCategories } from '../categories/categories-api.ts'
import { PurchaseDetailDialog } from './PurchaseDetailDialog.tsx'
import { PurchaseFormDialog } from './PurchaseFormDialog.tsx'
import { cancelPurchase, listPurchases, type Purchase } from './purchases-api.ts'

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
  const [notice, setNotice] = useState<string | null>(null)

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
      setNotice('Compra cancelada: se restauró el crédito disponible.')
      setCancelling(null)
      void queryClient.invalidateQueries({ queryKey: ['purchases'] })
      void queryClient.invalidateQueries({ queryKey: ['cards'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const items = purchases.data?.pages.flatMap((page) => page.data) ?? []

  return (
    <div data-testid="purchases-page">
      <PageHeader
        title="Compras"
        description="Regulares, meses sin intereses y diferidas"
        actions={
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            disabled={(cards.data ?? []).length === 0}
          >
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

      <div className="mb-4 space-y-3">
        <ErrorAlert error={cancel.error} />
        {notice && <SuccessAlert message={notice} />}
      </div>

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
        />
      )}

      {items.length > 0 && (
        <ul className="space-y-2" data-testid="purchases-list">
          {items.map((purchase) => {
            const nextInstallment = purchase.installmentPlan?.installments.find(
              (installment) => installment.status !== 'PAID',
            )
            return (
              <li key={purchase.id}>
                <Card className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm text-slate-900">
                        <span className="font-medium">{purchase.description}</span>
                        <Badge tone="neutral">{TYPE_LABELS[purchase.type] ?? purchase.type}</Badge>
                        <StatusBadge status={purchase.status} />
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {purchase.creditCard ? `${purchase.creditCard.alias} ····${purchase.creditCard.last4} · ` : ''}
                        {formatLocalDate(purchase.purchaseDate)}
                        {nextInstallment
                          ? ` · próxima #${nextInstallment.number} por ${(nextInstallment.totalAmount / 100).toFixed(2)} el ${formatLocalDate(nextInstallment.dueDate)}`
                          : ''}
                      </p>
                    </div>
                    <MoneyDisplay cents={purchase.amount} className="shrink-0 font-semibold" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setDetailId(purchase.id)}>
                      Detalle
                    </Button>
                    {purchase.status === 'ACTIVE' && (
                      <Button variant="secondary" size="sm" onClick={() => setCancelling(purchase)}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {purchases.hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="secondary"
            size="sm"
            disabled={purchases.isFetchingNextPage}
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
    </div>
  )
}
