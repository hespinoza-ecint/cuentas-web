import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { ErrorState } from '../../components/shared/ErrorState.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card, CardDescription, CardTitle } from '../../components/ui/card.tsx'
import { Checkbox } from '../../components/ui/checkbox.tsx'
import { ConfirmDialog } from '../../components/ui/confirm-dialog.tsx'
import { EmptyState } from '../../components/ui/empty-state.tsx'
import { ListRow } from '../../components/ui/list-row.tsx'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { Skeleton } from '../../components/ui/skeleton.tsx'
import { toast } from '../../lib/toast.ts'
import { formatLocalDate } from '../../lib/dates.ts'
import { listAccounts } from '../accounts/accounts-api.ts'
import { listCards } from '../cards/cards-api.ts'
import { listCategories } from '../categories/categories-api.ts'
import {
  confirmRecurring,
  listRecurring,
  removeRecurring,
  upcomingRecurring,
  type RecurringExpense,
} from './recurring-expenses-api.ts'
import { RecurringFormDialog } from './RecurringFormDialog.tsx'

const FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
  CUSTOM: 'Personalizada',
  ONE_TIME: 'Única',
}

function paymentSource(item: RecurringExpense): string {
  if (item.paymentMethod === 'CREDIT_CARD') {
    return item.creditCard
      ? `Tarjeta ${item.creditCard.alias} •••• ${item.creditCard.last4}`
      : 'Tarjeta de crédito'
  }
  return item.cashAccount ? `Cuenta ${item.cashAccount.name}` : 'Cuenta de efectivo'
}

export function RecurringPage() {
  const queryClient = useQueryClient()

  const [includeInactive, setIncludeInactive] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringExpense | null>(null)
  const [deleting, setDeleting] = useState<RecurringExpense | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const accounts = useQuery({ queryKey: ['accounts'], queryFn: listAccounts })
  const cards = useQuery({ queryKey: ['cards'], queryFn: listCards })
  const categories = useQuery({
    queryKey: ['categories', 'EXPENSE'],
    queryFn: () => listCategories('EXPENSE'),
  })
  const recurring = useQuery({
    queryKey: ['recurring-expenses', includeInactive],
    queryFn: () => listRecurring(includeInactive),
  })
  const upcoming = useQuery({
    queryKey: ['recurring-upcoming', 60],
    queryFn: () => upcomingRecurring(60),
  })

  const confirm = useMutation({
    mutationFn: ({ id, occurrenceDate }: { id: string; occurrenceDate: string }) =>
      // Sin fecha real: el backend fecha las vencidas en su dia (caen en su
      // corte) y las futuras confirmadas antes de tiempo, en hoy.
      confirmRecurring(id, { occurrenceDate }),
    onSuccess: (result) => {
      toast(
        result.purchaseId
          ? 'Ocurrencia confirmada: se registró la compra en la tarjeta.'
          : 'Ocurrencia confirmada: se registró el gasto y su movimiento.',
      )
      setConfirmingId(null)
      void queryClient.invalidateQueries({ queryKey: ['recurring-upcoming'] })
      void queryClient.invalidateQueries({ queryKey: ['expenses'] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      void queryClient.invalidateQueries({ queryKey: ['cards'] })
      void queryClient.invalidateQueries({ queryKey: ['purchases'] })
    },
    onError: () => setConfirmingId(null),
  })

  const remove = useMutation({
    mutationFn: removeRecurring,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['recurring-expenses', includeInactive] })
      void queryClient.invalidateQueries({ queryKey: ['recurring-upcoming'] })
      toast('Gasto recurrente eliminado.')
    },
  })

  const list = recurring.data ?? []
  const occurrences = upcoming.data?.occurrences ?? []
  const canCreate = (accounts.data ?? []).length > 0 || (cards.data ?? []).length > 0

  return (
    <div data-testid="recurring-page">
      <PageHeader
        title="Gastos recurrentes"
        description="Servicios y rentas que se repiten: confirma cada ocurrencia para registrarla"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!canCreate}>
            Nuevo recurrente
          </Button>
        }
      />

      <div className="mb-4 space-y-3">
        <ErrorAlert error={remove.error ?? confirm.error} />
      </div>

      <Card className="mb-5">
        <CardTitle>Ocurrencias por confirmar</CardTitle>
        <CardDescription>
          Incluye las vencidas recientes y las próximas ({upcoming.data?.horizonDays ?? 60} días).
          Confírmalas cuando ya hayas pagado; puedes ajustar el monto después.
        </CardDescription>

        {upcoming.isPending && <Skeleton className="mt-3 h-16" />}
        {upcoming.isError && (
          <ErrorState error={upcoming.error} onRetry={() => void upcoming.refetch()} />
        )}
        {upcoming.data && occurrences.length === 0 && (
          <p className="mt-3 text-sm text-ink-muted">No hay ocurrencias próximas.</p>
        )}
        {occurrences.length > 0 && (
          <ul className="mt-3 divide-y divide-line" data-testid="upcoming-occurrences">
            {occurrences.map((occurrence) => (
              <li
                key={`${occurrence.recurringExpenseId}-${occurrence.expectedDate}`}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-sm text-ink">
                    <span className="font-medium">{occurrence.name}</span>
                    <span className="ml-2 text-xs text-ink-muted">
                      {formatLocalDate(occurrence.expectedDate)}
                      {occurrence.daysUntil >= 0
                        ? ` · en ${occurrence.daysUntil} días`
                        : ' · vencida'}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <MoneyDisplay cents={-occurrence.amount} colored className="font-medium" />
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={
                      confirm.isPending && confirmingId === occurrence.recurringExpenseId
                    }
                    onClick={() => {
                      setConfirmingId(occurrence.recurringExpenseId)
                      confirm.mutate({
                        id: occurrence.recurringExpenseId,
                        occurrenceDate: occurrence.expectedDate,
                      })
                    }}
                  >
                    <Check className="size-3.5" aria-hidden="true" />
                    Confirmar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Checkbox
        className="mb-3"
        label="Mostrar inactivos"
        checked={includeInactive}
        onChange={(event) => setIncludeInactive(event.target.checked)}
      />

      {recurring.isPending && (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      )}
      {recurring.isError && (
        <ErrorState error={recurring.error} onRetry={() => void recurring.refetch()} />
      )}

      {recurring.data && list.length === 0 && (
        <EmptyState
          title="Sin gastos recurrentes"
          description="Crea uno para proyectar rentas, servicios y suscripciones."
          action={
            canCreate ? (
              <Button variant="secondary" onClick={() => setCreateOpen(true)}>
                Nuevo recurrente
              </Button>
            ) : undefined
          }
        />
      )}

      {list.length > 0 && (
        <ul className="space-y-2" data-testid="recurring-list">
          {list.map((item) => (
            <ListRow
              key={item.id}
              onOpen={() => setEditing(item)}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {item.name}
                  <Badge tone={item.isActive ? 'success' : 'neutral'}>
                    {item.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                  <Badge tone="neutral">
                    {FREQUENCY_LABELS[item.frequency] ?? item.frequency}
                  </Badge>
                </span>
              }
              subtitle={[
                `Desde ${formatLocalDate(item.startDate)}${item.endDate ? ` hasta ${formatLocalDate(item.endDate)}` : ''}`,
                paymentSource(item),
                item.category?.name,
              ]
                .filter(Boolean)
                .join(' · ')}
              trailing={<MoneyDisplay cents={-item.amount} colored className="font-semibold" />}
              menu={[
                { label: 'Editar', icon: Pencil, onSelect: () => setEditing(item) },
                {
                  label: 'Eliminar',
                  icon: Trash2,
                  tone: 'danger',
                  onSelect: () => setDeleting(item),
                },
              ]}
              menuLabel={`Más acciones de ${item.name}`}
            />
          ))}
        </ul>
      )}

      {createOpen && (
        <RecurringFormDialog
          accounts={accounts.data ?? []}
          cards={cards.data ?? []}
          categories={categories.data ?? []}
          open
          onOpenChange={setCreateOpen}
        />
      )}
      {editing && (
        <RecurringFormDialog
          accounts={accounts.data ?? []}
          cards={cards.data ?? []}
          categories={categories.data ?? []}
          open
          onOpenChange={(open) => {
            if (!open) {
              setEditing(null)
            }
          }}
          editing={editing}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null)
          }
        }}
        title="Eliminar gasto recurrente"
        description={
          deleting
            ? `Se ocultará "${deleting.name}". Los gastos ya confirmados se conservan.`
            : ''
        }
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (deleting) {
            await remove.mutateAsync(deleting.id)
          }
        }}
      />
    </div>
  )
}
