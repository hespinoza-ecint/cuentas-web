import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { ErrorState } from '../../components/shared/ErrorState.tsx'
import { StatusBadge } from '../../components/shared/StatusBadge.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card } from '../../components/ui/card.tsx'
import { EmptyState } from '../../components/ui/empty-state.tsx'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { Skeleton } from '../../components/ui/skeleton.tsx'
import { ActionMenu } from '../../components/ui/action-menu.tsx'
import { toast } from '../../lib/toast.ts'
import { ReasonDialog } from '../../components/shared/ReasonDialog.tsx'
import { cn } from '../../lib/utils.ts'
import { CardFormDialog } from './CardFormDialog.tsx'
import { deleteCard, listCards, resetCard, type CreditCard } from './cards-api.ts'

/** Nivel de uso con palabra (no solo color): accesible para daltonismo. */
function utilizationLevel(ratio: number): { label: string; tone: string } {
  if (ratio <= 0.3) {
    return { label: 'Uso bajo', tone: 'bg-success' }
  }
  if (ratio <= 0.5) {
    return { label: 'Uso medio', tone: 'bg-warning' }
  }
  return { label: 'Uso alto', tone: 'bg-danger' }
}

export function CardsPage() {
  const queryClient = useQueryClient()
  const cards = useQuery({ queryKey: ['cards'], queryFn: listCards })

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<CreditCard | null>(null)
  const [resetting, setResetting] = useState<CreditCard | null>(null)
  const [deleting, setDeleting] = useState<CreditCard | null>(null)

  const reset = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => resetCard(id, reason),
    onSuccess: (result) => {
      toast(result.message)
      setResetting(null)
      void queryClient.invalidateQueries({ queryKey: ['cards'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const remove = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => deleteCard(id, reason),
    onSuccess: (result) => {
      toast(result.message)
      setDeleting(null)
      void queryClient.invalidateQueries({ queryKey: ['cards'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
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
        <ErrorAlert error={reset.error ?? remove.error} />
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
            const ratio = card.creditLimit > 0 ? card.currentBalance / card.creditLimit : 0
            const level = utilizationLevel(ratio)
            return (
              <li key={card.id}>
                <Card className="p-0">
                  <div className="flex items-start justify-between gap-2 px-4 pt-3">
                    <p className="flex min-w-0 flex-wrap items-center gap-2 pt-1 text-sm font-medium text-ink">
                      <span className="truncate">{card.alias}</span>
                      <span className="text-ink-muted">····{card.last4}</span>
                      <StatusBadge status={card.status} />
                    </p>
                    <ActionMenu
                      label={`Más acciones de ${card.alias}`}
                      items={[
                        { label: 'Editar', icon: Pencil, onSelect: () => setEditing(card) },
                        {
                          label: 'Reiniciar',
                          icon: RotateCcw,
                          onSelect: () => setResetting(card),
                        },
                        {
                          label: 'Eliminar',
                          icon: Trash2,
                          tone: 'danger',
                          onSelect: () => setDeleting(card),
                        },
                      ]}
                    />
                  </div>

                  <Link
                    to={`/tarjetas/${card.id}`}
                    className="block rounded-b-xl px-4 pt-1 pb-4 transition active:bg-surface-subtle"
                  >
                    <p className="text-xs text-ink-muted">
                      {card.institution} · corta el día {card.cutDay} ·{' '}
                      {card.dueDateMode === 'FIXED_DAY'
                        ? `paga el día ${card.dueDay}`
                        : `paga ${card.dueDaysAfterCut} días después`}
                    </p>

                    <div className="mt-3 flex items-baseline justify-between text-sm">
                      <span className="text-ink-muted">Saldo</span>
                      <MoneyDisplay
                        cents={card.currentBalance}
                        className="text-base font-semibold"
                      />
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-strong">
                      <div
                        className={cn('h-full rounded-full', level.tone)}
                        style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-ink-muted">
                      {level.label} · {(ratio * 100).toFixed(1)}% · disponible{' '}
                      <MoneyDisplay cents={card.availableCredit} className="font-medium" /> de{' '}
                      <MoneyDisplay cents={card.creditLimit} className="font-medium" />
                    </p>
                  </Link>
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
