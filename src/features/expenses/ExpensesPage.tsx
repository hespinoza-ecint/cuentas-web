import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { ErrorState } from '../../components/shared/ErrorState.tsx'
import { Field } from '../../components/shared/Field.tsx'
import { ReasonDialog } from '../../components/shared/ReasonDialog.tsx'
import { SelectField } from '../../components/shared/SelectField.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card } from '../../components/ui/card.tsx'
import { EmptyState } from '../../components/ui/empty-state.tsx'
import { FiltersCard } from '../../components/ui/filters-card.tsx'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { Skeleton } from '../../components/ui/skeleton.tsx'
import { formatLocalDate } from '../../lib/dates.ts'
import { listAccounts } from '../accounts/accounts-api.ts'
import { listCategories } from '../categories/categories-api.ts'
import { ExpenseFormDialog } from './ExpenseFormDialog.tsx'
import { listExpenses, reverseExpense, type Expense } from './expenses-api.ts'

export function ExpensesPage() {
  const queryClient = useQueryClient()
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: listAccounts })
  const categories = useQuery({
    queryKey: ['categories', 'EXPENSE'],
    queryFn: () => listCategories('EXPENSE'),
  })

  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [reversing, setReversing] = useState<Expense | null>(null)

  const filters = {
    cashAccountId: accountId || undefined,
    categoryId: categoryId || undefined,
    from: from || undefined,
    to: to || undefined,
  }
  const hasFilters = Boolean(accountId || categoryId || from || to)

  const expenses = useInfiniteQuery({
    queryKey: ['expenses', filters],
    queryFn: ({ pageParam }) =>
      listExpenses({ ...filters, limit: 20, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  })

  const reverse = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => reverseExpense(id, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses'] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setReversing(null)
    },
  })

  const items = expenses.data?.pages.flatMap((page) => page.data) ?? []
  const accountName = new Map((accounts.data ?? []).map((account) => [account.id, account.name]))

  return (
    <div data-testid="expenses-page">
      <PageHeader
        title="Gastos"
        description="Gastos pagados con efectivo o débito (RN-25)"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)} disabled={(accounts.data ?? []).length === 0}>
            Registrar gasto
          </Button>
        }
      />

      <FiltersCard activeCount={[accountId, categoryId, from, to].filter(Boolean).length}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField label="Cuenta" value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            <option value="">Todas</option>
            {(accounts.data ?? []).map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Categoría"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">Todas</option>
            {(categories.data ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectField>
          <Field label="Desde" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <Field label="Hasta" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() => {
              setAccountId('')
              setCategoryId('')
              setFrom('')
              setTo('')
            }}
          >
            Limpiar filtros
          </Button>
        )}
      </FiltersCard>

      <ErrorAlert error={reverse.error} className="mb-4" />

      {expenses.isPending && (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      )}
      {expenses.isError && <ErrorState error={expenses.error} onRetry={() => void expenses.refetch()} />}

      {expenses.data && items.length === 0 && (
        <EmptyState
          title="Sin gastos"
          description="Registra tu primer gasto o ajusta los filtros."
        />
      )}

      {items.length > 0 && (
        <ul className="space-y-2" data-testid="expenses-list">
          {items.map((expense) => (
            <li key={expense.id}>
              <Card className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm text-slate-900">
                      <span className="font-medium">{expense.description}</span>
                      {expense.category && <Badge tone="neutral">{expense.category.name}</Badge>}
                      {expense.status === 'REVERSED' && <Badge tone="warning">Revertido</Badge>}
                      {expense.recurringExpenseId && <Badge tone="info">Recurrente</Badge>}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatLocalDate(expense.expenseDate)}
                      {accountName.get(expense.cashAccountId)
                        ? ` · ${accountName.get(expense.cashAccountId)}`
                        : ''}
                    </p>
                  </div>
                  <MoneyDisplay
                    cents={-expense.amount}
                    colored
                    className="shrink-0 font-semibold"
                  />
                </div>
                {expense.status !== 'REVERSED' && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setReversing(expense)}>
                      Revertir
                    </Button>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      {expenses.hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="secondary"
            size="sm"
            disabled={expenses.isFetchingNextPage}
            onClick={() => void expenses.fetchNextPage()}
          >
            {expenses.isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
          </Button>
        </div>
      )}

      {createOpen && (
        <ExpenseFormDialog
          accounts={accounts.data ?? []}
          categories={categories.data ?? []}
          open
          onOpenChange={setCreateOpen}
        />
      )}

      <ReasonDialog
        open={reversing !== null}
        onOpenChange={(open) => !open && setReversing(null)}
        title="Revertir gasto"
        description={
          reversing
            ? `Se devolverá ${formatLocalDate(reversing.expenseDate)} a la cuenta.`
            : ''
        }
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
