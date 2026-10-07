import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { ErrorState } from '../../components/shared/ErrorState.tsx'
import { SuccessAlert } from '../../components/shared/SuccessAlert.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card, CardDescription, CardTitle } from '../../components/ui/card.tsx'
import { ConfirmDialog } from '../../components/ui/confirm-dialog.tsx'
import { EmptyState } from '../../components/ui/empty-state.tsx'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { Skeleton } from '../../components/ui/skeleton.tsx'
import { formatLocalDate } from '../../lib/dates.ts'
import { listAccounts } from '../accounts/accounts-api.ts'
import { listCards } from '../cards/cards-api.ts'
import { listCategories } from '../categories/categories-api.ts'
import { useToday } from '../users/use-settings.ts'
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
  const today = useToday()

  const [includeInactive, setIncludeInactive] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringExpense | null>(null)
  const [deleting, setDeleting] = useState<RecurringExpense | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

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
      confirmRecurring(id, { occurrenceDate, actualDate: today }),
    onSuccess: (result) => {
      setNotice(
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
    },
  })

  const list = recurring.data ?? []
  const occurrences = upcoming.data?.occurrences ?? []

  return (
    <div data-testid="recurring-page">
      <PageHeader
        title="Gastos recurrentes"
        description="Servicios y rentas que se repiten: confirma cada ocurrencia para registrarla"
        actions={
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            disabled={(accounts.data ?? []).length === 0 && (cards.data ?? []).length === 0}
          >
            Nuevo recurrente
          </Button>
        }
      />

      <div className="mb-4 space-y-3">
        <ErrorAlert error={remove.error ?? confirm.error} />
        {notice && <SuccessAlert message={notice} />}
      </div>

      <Card className="mb-5">
        <CardTitle>Próximas ocurrencias ({upcoming.data?.horizonDays ?? 60} días)</CardTitle>
        <CardDescription>Confírmalas cuando ya hayas pagado; puedes ajustar el monto después.</CardDescription>

        {upcoming.isPending && <Skeleton className="mt-3 h-16" />}
        {upcoming.isError && (
          <ErrorState error={upcoming.error} onRetry={() => void upcoming.refetch()} />
        )}
        {upcoming.data && occurrences.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">No hay ocurrencias próximas.</p>
        )}
        {occurrences.length > 0 && (
          <ul className="mt-3 divide-y divide-slate-100" data-testid="upcoming-occurrences">
            {occurrences.map((occurrence) => (
              <li
                key={`${occurrence.recurringExpenseId}-${occurrence.expectedDate}`}
                className="flex flex-wrap items-center justify-between gap-3 py-2"
              >
                <div>
                  <p className="text-sm text-slate-900">
                    <span className="font-medium">{occurrence.name}</span>
                    <span className="ml-2 text-xs text-slate-500">
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
                    disabled={confirm.isPending && confirmingId === occurrence.recurringExpenseId}
                    onClick={() => {
                      setNotice(null)
                      setConfirmingId(occurrence.recurringExpenseId)
                      confirm.mutate({
                        id: occurrence.recurringExpenseId,
                        occurrenceDate: occurrence.expectedDate,
                      })
                    }}
                  >
                    Confirmar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="size-4 rounded border-slate-300"
          checked={includeInactive}
          onChange={(event) => setIncludeInactive(event.target.checked)}
        />
        Mostrar inactivos
      </label>

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
        />
      )}

      {list.length > 0 && (
        <ul className="space-y-2" data-testid="recurring-list">
          {list.map((item) => (
            <li key={item.id}>
              <Card className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm text-slate-900">
                      <span className="font-medium">{item.name}</span>
                      <Badge tone={item.isActive ? 'success' : 'neutral'}>
                        {item.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                      <Badge tone="neutral">
                        {FREQUENCY_LABELS[item.frequency] ?? item.frequency}
                      </Badge>
                      {item.category && <span className="text-xs text-slate-500">{item.category.name}</span>}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Desde {formatLocalDate(item.startDate)}
                      {item.endDate ? ` hasta ${formatLocalDate(item.endDate)}` : ''} ·{' '}
                      {paymentSource(item)}
                    </p>
                  </div>
                  <MoneyDisplay cents={-item.amount} colored className="shrink-0 font-semibold" />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(item)}>
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleting(item)}>
                    Eliminar
                  </Button>
                </div>
              </Card>
            </li>
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
