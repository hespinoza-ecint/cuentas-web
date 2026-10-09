import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeDollarSign, Calculator, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { ErrorState } from '../../components/shared/ErrorState.tsx'
import { StatusBadge } from '../../components/shared/StatusBadge.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button.tsx'
import { ConfirmDialog } from '../../components/ui/confirm-dialog.tsx'
import { EmptyState } from '../../components/ui/empty-state.tsx'
import { ListRow } from '../../components/ui/list-row.tsx'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { Skeleton } from '../../components/ui/skeleton.tsx'
import { toast } from '../../lib/toast.ts'
import { formatCents } from '../../lib/money.ts'
import { AccountEditDialog } from './AccountEditDialog.tsx'
import { AccountFormDialog } from './AccountFormDialog.tsx'
import { OpeningBalanceDialog } from './OpeningBalanceDialog.tsx'
import { TransferDialog } from './TransferDialog.tsx'
import {
  listAccounts,
  recalculateAccount,
  removeAccount,
  type CashAccount,
} from './accounts-api.ts'

const TYPE_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  DEBIT: 'Débito',
  SAVINGS: 'Ahorro',
  OTHER: 'Otra',
}

export function AccountsPage() {
  const queryClient = useQueryClient()
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: listAccounts })

  const [createOpen, setCreateOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [editing, setEditing] = useState<CashAccount | null>(null)
  const [openingFor, setOpeningFor] = useState<CashAccount | null>(null)
  const [deleting, setDeleting] = useState<CashAccount | null>(null)

  const recalculate = useMutation({
    mutationFn: recalculateAccount,
    onSuccess: (result) => {
      toast(
        result.matches
          ? `El saldo ya coincidía con el libro (${result.movementCount} movimientos).`
          : `Saldo corregido a ${formatCents(result.calculatedBalance)}.`,
      )
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })

  const remove = useMutation({
    mutationFn: removeAccount,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      toast('Cuenta eliminada del listado.')
    },
  })

  const list = accounts.data ?? []

  return (
    <div data-testid="accounts-page">
      <PageHeader
        title="Cuentas de efectivo"
        description="Efectivo, débito y ahorro: el punto de partida de tus decisiones"
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              disabled={list.length < 2}
              onClick={() => setTransferOpen(true)}
            >
              Transferir
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              Nueva cuenta
            </Button>
          </>
        }
      />

      <div className="mb-4 space-y-3">
        <ErrorAlert error={recalculate.error ?? remove.error} />
      </div>

      {accounts.isPending && (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      )}
      {accounts.isError && (
        <ErrorState error={accounts.error} onRetry={() => void accounts.refetch()} />
      )}

      {accounts.data && list.length === 0 && (
        <EmptyState
          title="Aún no tienes cuentas"
          description="Crea tu primera cuenta de efectivo, débito o ahorro para empezar a registrar movimientos."
          action={<Button onClick={() => setCreateOpen(true)}>Nueva cuenta</Button>}
        />
      )}

      {list.length > 0 && (
        <ul className="space-y-2" data-testid="accounts-list">
          {list.map((account) => (
            <ListRow
              key={account.id}
              onOpen={() => setEditing(account)}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {account.name}
                  {account.isDefault && <Badge tone="info">Predeterminada</Badge>}
                  {!account.isSpendable && <Badge tone="neutral">No gastable</Badge>}
                  <StatusBadge status={account.status} />
                </span>
              }
              subtitle={`${TYPE_LABELS[account.type] ?? account.type} · ${account.currency}`}
              trailing={
                <MoneyDisplay
                  cents={account.currentBalance}
                  colored
                  className="text-base font-semibold"
                />
              }
              menu={[
                {
                  label: 'Editar',
                  icon: Pencil,
                  onSelect: () => setEditing(account),
                },
                {
                  label: 'Saldo inicial',
                  icon: BadgeDollarSign,
                  onSelect: () => setOpeningFor(account),
                },
                {
                  label: 'Recalcular',
                  icon: Calculator,
                  disabled: recalculate.isPending,
                  onSelect: () => recalculate.mutate(account.id),
                },
                {
                  label: 'Eliminar',
                  icon: Trash2,
                  tone: 'danger',
                  onSelect: () => setDeleting(account),
                },
              ]}
              menuLabel={`Más acciones de ${account.name}`}
            />
          ))}
        </ul>
      )}

      {createOpen && <AccountFormDialog open onOpenChange={setCreateOpen} />}
      {transferOpen && (
        <TransferDialog accounts={list} open onOpenChange={setTransferOpen} />
      )}
      {editing && (
        <AccountEditDialog
          account={editing}
          open={editing !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditing(null)
            }
          }}
        />
      )}
      {openingFor && (
        <OpeningBalanceDialog
          account={openingFor}
          open={openingFor !== null}
          onOpenChange={(open) => {
            if (!open) {
              setOpeningFor(null)
            }
          }}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null)
          }
        }}
        title="Eliminar cuenta"
        description={
          deleting
            ? `Se ocultará "${deleting.name}". Solo es posible si su saldo es cero.`
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
