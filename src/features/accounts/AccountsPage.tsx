import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { ErrorState } from '../../components/shared/ErrorState.tsx'
import { StatusBadge } from '../../components/shared/StatusBadge.tsx'
import { SuccessAlert } from '../../components/shared/SuccessAlert.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card } from '../../components/ui/card.tsx'
import { ConfirmDialog } from '../../components/ui/confirm-dialog.tsx'
import { EmptyState } from '../../components/ui/empty-state.tsx'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { Skeleton } from '../../components/ui/skeleton.tsx'
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
  const [notice, setNotice] = useState<string | null>(null)

  const recalculate = useMutation({
    mutationFn: recalculateAccount,
    onSuccess: (result) => {
      setNotice(
        result.matches
          ? `El saldo coincidía con el libro (${result.movementCount} movimientos).`
          : `Saldo corregido a ${formatCents(result.calculatedBalance)}.`,
      )
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
    onError: () => setNotice(null),
  })

  const remove = useMutation({
    mutationFn: removeAccount,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  })

  const list = accounts.data ?? []

  return (
    <div data-testid="accounts-page">
      <PageHeader
        title="Cuentas de efectivo"
        description="El saldo se calcula desde el libro de movimientos (RN-05)"
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
        <ErrorAlert error={remove.error} />
        {notice && <SuccessAlert message={notice} />}
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
        <ul className="space-y-3" data-testid="accounts-list">
          {list.map((account) => (
            <li key={account.id}>
              <Card className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                      {account.name}
                      {account.isDefault && <Badge tone="info">Predeterminada</Badge>}
                      {!account.isSpendable && <Badge tone="neutral">No gastable</Badge>}
                      <StatusBadge status={account.status} />
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {TYPE_LABELS[account.type] ?? account.type} · {account.currency}
                    </p>
                  </div>
                  <p className="text-xl font-semibold">
                    <MoneyDisplay cents={account.currentBalance} colored />
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(account)}>
                    Editar
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setOpeningFor(account)}>
                    Saldo inicial
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={recalculate.isPending}
                    onClick={() => {
                      setNotice(null)
                      recalculate.mutate(account.id)
                    }}
                  >
                    Recalcular
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleting(account)}>
                    Eliminar
                  </Button>
                </div>
              </Card>
            </li>
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
