import { useQuery } from '@tanstack/react-query'
import { CreditCard, Plus, Receipt, TrendingUp } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ErrorAlert } from '../components/shared/ErrorAlert.tsx'
import { MoneyDisplay } from '../components/shared/MoneyDisplay.tsx'
import { Button } from '../components/ui/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog.tsx'
import { Skeleton } from '../components/ui/skeleton.tsx'
import { formatLocalDate } from '../lib/dates.ts'
import { listAccounts } from '../features/accounts/accounts-api.ts'
import { listCards } from '../features/cards/cards-api.ts'
import { listCategories } from '../features/categories/categories-api.ts'
import { ExpenseFormDialog } from '../features/expenses/ExpenseFormDialog.tsx'
import { ConfirmIncomeDialog } from '../features/income/ConfirmIncomeDialog.tsx'
import { upcomingIncome, type UpcomingIncomeItem } from '../features/income/income-api.ts'
import { PurchaseFormDialog } from '../features/purchases/PurchaseFormDialog.tsx'

type QuickAction = 'expense' | 'purchase' | 'income'

/**
 * Botón flotante "＋" (solo móvil) para capturar rápido un gasto, una compra
 * con tarjeta o confirmar un ingreso próximo, sin navegar a cada pantalla.
 */
export function QuickActions() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [action, setAction] = useState<QuickAction | null>(null)

  function choose(next: QuickAction) {
    setSheetOpen(false)
    setAction(next)
  }

  return (
    <>
      <button
        type="button"
        aria-label="Acciones rápidas"
        onClick={() => setSheetOpen(true)}
        className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-40 flex size-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition active:scale-95 md:hidden"
      >
        <Plus className="size-6" aria-hidden="true" />
      </button>

      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Registrar</DialogTitle>
          <DialogDescription>¿Qué quieres capturar?</DialogDescription>
          <div className="mt-4 space-y-2">
            <QuickOption
              icon={<Receipt className="size-5" aria-hidden="true" />}
              label="Gasto"
              description="Efectivo o débito"
              onClick={() => choose('expense')}
            />
            <QuickOption
              icon={<CreditCard className="size-5" aria-hidden="true" />}
              label="Compra con tarjeta"
              description="Regular, MSI o diferida"
              onClick={() => choose('purchase')}
            />
            <QuickOption
              icon={<TrendingUp className="size-5" aria-hidden="true" />}
              label="Ingreso"
              description="Confirmar un depósito próximo"
              onClick={() => choose('income')}
            />
          </div>
        </DialogContent>
      </Dialog>

      {action === 'expense' && <QuickExpenseDialog onClose={() => setAction(null)} />}
      {action === 'purchase' && <QuickPurchaseDialog onClose={() => setAction(null)} />}
      {action === 'income' && <QuickIncomeDialog onClose={() => setAction(null)} />}
    </>
  )
}

function QuickOption({
  icon,
  label,
  description,
  onClick,
}: {
  icon: ReactNode
  label: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:bg-slate-50 active:bg-slate-100"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-900">{label}</span>
        <span className="block text-xs text-slate-500">{description}</span>
      </span>
    </button>
  )
}

function QuickExpenseDialog({ onClose }: { onClose: () => void }) {
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: listAccounts })
  const categories = useQuery({
    queryKey: ['categories', 'EXPENSE'],
    queryFn: () => listCategories('EXPENSE'),
  })

  if (accounts.isPending || categories.isPending) {
    return <PendingSheet title="Registrar gasto" onClose={onClose} />
  }
  if ((accounts.data ?? []).length === 0) {
    return (
      <NoticeSheet
        title="Registrar gasto"
        message="Primero crea una cuenta de efectivo para poder registrar gastos."
        linkTo="/cuentas"
        linkLabel="Ir a Cuentas"
        onClose={onClose}
      />
    )
  }
  return (
    <ExpenseFormDialog
      accounts={accounts.data ?? []}
      categories={categories.data ?? []}
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    />
  )
}

function QuickPurchaseDialog({ onClose }: { onClose: () => void }) {
  const cards = useQuery({ queryKey: ['cards'], queryFn: listCards })
  const categories = useQuery({
    queryKey: ['categories', 'EXPENSE'],
    queryFn: () => listCategories('EXPENSE'),
  })

  if (cards.isPending || categories.isPending) {
    return <PendingSheet title="Registrar compra" onClose={onClose} />
  }
  if ((cards.data ?? []).length === 0) {
    return (
      <NoticeSheet
        title="Registrar compra"
        message="Primero registra una tarjeta de crédito para poder capturar compras."
        linkTo="/tarjetas"
        linkLabel="Ir a Tarjetas"
        onClose={onClose}
      />
    )
  }
  return (
    <PurchaseFormDialog
      cards={cards.data ?? []}
      categories={categories.data ?? []}
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    />
  )
}

function QuickIncomeDialog({ onClose }: { onClose: () => void }) {
  const upcoming = useQuery({
    queryKey: ['income-upcoming', 60],
    queryFn: () => upcomingIncome(60),
  })
  const [confirming, setConfirming] = useState<UpcomingIncomeItem | null>(null)

  if (confirming) {
    return (
      <ConfirmIncomeDialog
        occurrence={confirming}
        open
        onOpenChange={(open) => {
          if (!open) {
            setConfirming(null)
          }
        }}
      />
    )
  }

  const occurrences = (upcoming.data?.occurrences ?? []).slice(0, 6)

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent>
        <DialogTitle>Confirmar ingreso</DialogTitle>
        <DialogDescription>Depósitos próximos según tus fuentes y calendarios.</DialogDescription>

        {upcoming.isPending && (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        )}
        {upcoming.isError && <ErrorAlert error={upcoming.error} className="mt-4" />}
        {upcoming.data && occurrences.length === 0 && (
          <p className="mt-4 text-sm text-slate-500">No hay ingresos próximos por confirmar.</p>
        )}

        {occurrences.length > 0 && (
          <ul className="mt-4 space-y-2">
            {occurrences.map((occurrence) => (
              <li
                key={`${occurrence.incomeScheduleId}-${occurrence.expectedDate}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {occurrence.incomeSourceName}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatLocalDate(occurrence.expectedDate)} ·{' '}
                    <MoneyDisplay cents={occurrence.expectedAmount} className="font-medium" />
                  </p>
                </div>
                <Button size="sm" onClick={() => setConfirming(occurrence)}>
                  Confirmar
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Link
            to="/ingresos"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-700 sm:h-9"
          >
            Ir a Ingresos
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PendingSheet({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <Skeleton className="mt-4 h-10" />
        <Skeleton className="mt-2 h-10" />
        <Skeleton className="mt-2 h-10" />
      </DialogContent>
    </Dialog>
  )
}

function NoticeSheet({
  title,
  message,
  linkTo,
  linkLabel,
  onClose,
}: {
  title: string
  message: string
  linkTo?: string
  linkLabel?: string
  onClose: () => void
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{message}</DialogDescription>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          {linkTo && linkLabel && (
            <Link
              to={linkTo}
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-700 sm:h-9"
            >
              {linkLabel}
            </Link>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
