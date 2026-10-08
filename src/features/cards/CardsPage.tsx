import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { ErrorState } from '../../components/shared/ErrorState.tsx'
import { StatusBadge } from '../../components/shared/StatusBadge.tsx'
import { SuccessAlert } from '../../components/shared/SuccessAlert.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card } from '../../components/ui/card.tsx'
import { EmptyState } from '../../components/ui/empty-state.tsx'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { Skeleton } from '../../components/ui/skeleton.tsx'
import { ReasonDialog } from '../../components/shared/ReasonDialog.tsx'
import { cn } from '../../lib/utils.ts'
import { CardFormDialog } from './CardFormDialog.tsx'
import { deleteCard, listCards, resetCard, type CreditCard } from './cards-api.ts'

export function CardsPage() {
  const queryClient = useQueryClient()
  const cards = useQuery({ queryKey: ['cards'], queryFn: listCards })

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<CreditCard | null>(null)
  const [resetting, setResetting] = useState<CreditCard | null>(null)
  const [deleting, setDeleting] = useState<CreditCard | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const reset = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => resetCard(id, reason),
    onSuccess: (result) => {
      setNotice(result.message)
      setResetting(null)
      void queryClient.invalidateQueries({ queryKey: ['cards'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: () => setNotice(null),
  })

  const remove = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => deleteCard(id, reason),
    onSuccess: (result) => {
      setNotice(result.message)
      setDeleting(null)
      void queryClient.invalidateQueries({ queryKey: ['cards'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: () => setNotice(null),
  })

  const list = cards.data ?? []

  return (
    <div data-testid="cards-page">
      <PageHeader
        title="Tarjetas de crédito"
        description="Corte, fecha límite, utilización y estados de cuenta"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            Nueva tarjeta
          </Button>
        }
      />

      <div className="mb-4 space-y-3">
        <ErrorAlert error={remove.error} />
        {notice && <SuccessAlert message={notice} />}
      </div>

      {cards.isPending && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      )}
      {cards.isError && <ErrorState error={cards.error} onRetry={() => void cards.refetch()} />}

      {cards.data && list.length === 0 && (
        <EmptyState
          title="Sin tarjetas"
          description="Registra tu primera tarjeta para ver cortes, mensualidades y recomendaciones."
          action={<Button onClick={() => setCreateOpen(true)}>Nueva tarjeta</Button>}
        />
      )}

      {list.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2" data-testid="cards-list">
          {list.map((card) => {
            const utilization = card.creditLimit > 0 ? card.currentBalance / card.creditLimit : 0
            return (
              <li key={card.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
                        {card.alias} <span className="text-slate-400">····{card.last4}</span>
                        <StatusBadge status={card.status} />
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {card.institution} · corta el día {card.cutDay} ·{' '}
                        {card.dueDateMode === 'FIXED_DAY'
                          ? `paga el día ${card.dueDay}`
                          : `paga ${card.dueDaysAfterCut} días después`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-slate-500">Saldo</span>
                      <MoneyDisplay cents={card.currentBalance} className="font-semibold" />
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          utilization <= 0.3 ? 'bg-emerald-500' : utilization <= 0.5 ? 'bg-amber-500' : 'bg-red-500',
                        )}
                        style={{ width: `${Math.min(utilization * 100, 100)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Disponible <MoneyDisplay cents={card.availableCredit} className="font-medium" /> de{' '}
                      <MoneyDisplay cents={card.creditLimit} className="font-medium" /> ·{' '}
                      {(utilization * 100).toFixed(1)}%
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      to={`/tarjetas/${card.id}`}
                      className="inline-flex h-8 items-center rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Ver detalle
                    </Link>
                    <Button variant="secondary" size="sm" onClick={() => setEditing(card)}>
                      Editar
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setResetting(card)}>
                      Reiniciar
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setDeleting(card)}>
                      Eliminar
                    </Button>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {createOpen && <CardFormDialog open onOpenChange={setCreateOpen} />}
      {editing && (
        <CardFormDialog
          open
          editing={editing}
          onOpenChange={(open) => {
            if (!open) {
              setEditing(null)
            }
          }}
        />
      )}

      <ReasonDialog
        open={resetting !== null}
        onOpenChange={(open) => !open && setResetting(null)}
        title="Reiniciar tarjeta"
        description={
          resetting
            ? `Se borrará todo el historial de "${resetting.alias}" (cortes, pagos, compras y movimientos) y quedará como nueva: saldo $0 y crédito completo. Lo ya pagado en efectivo no se devuelve. Los gastos recurrentes se conservan.`
            : ''
        }
        confirmLabel="Reiniciar tarjeta"
        pending={reset.isPending}
        onSubmit={async (reason) => {
          if (resetting) {
            await reset.mutateAsync({ id: resetting.id, reason })
          }
        }}
      />

      <ReasonDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Eliminar tarjeta"
        description={
          deleting
            ? `Se eliminará "${deleting.alias}" y TODO su historial: cortes, pagos, compras, movimientos y los gastos recurrentes configurados con ella. Lo ya pagado en efectivo no se devuelve.`
            : ''
        }
        confirmLabel="Eliminar tarjeta"
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
