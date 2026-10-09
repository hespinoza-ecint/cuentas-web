import { useQuery } from '@tanstack/react-query'
import { ArrowDownRight, ArrowUpRight, CreditCard, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
import { ErrorState } from '../../components/shared/ErrorState.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { Card, CardDescription, CardTitle } from '../../components/ui/card.tsx'
import { EmptyState } from '../../components/ui/empty-state.tsx'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { Skeleton } from '../../components/ui/skeleton.tsx'
import { addDays, formatLocalDate, formatMonth } from '../../lib/dates.ts'
import { cn } from '../../lib/utils.ts'
import { useSessionUser } from '../auth/use-session.ts'
import { useToday } from '../users/use-settings.ts'
import { CashflowChart } from './CashflowChart.tsx'
import { fetchCashflowProjection, fetchDashboardSummary } from './dashboard-api.ts'

const PAYMENT_TYPES: Record<string, string> = {
  RECURRING_EXPENSE: 'Recurrente',
  CARD_STATEMENT: 'Corte',
  INSTALLMENT: 'Mensualidad',
  ANNUAL_FEE: 'Anualidad',
}

/** Ventana por defecto de la proyeccion: hoy a hoy + 30 dias. */
const DEFAULT_WINDOW_DAYS = 30
/** Tope de la ventana (el backend tambien lo valida). */
const MAX_WINDOW_DAYS = 1825

export function DashboardPage() {
  const user = useSessionUser()
  const today = useToday()
  const [range, setRange] = useState<{ from: string; to: string } | null>(null)
  const from = range?.from ?? today
  const to = range?.to ?? addDays(today, DEFAULT_WINDOW_DAYS)

  const summary = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => fetchDashboardSummary(),
  })
  const projection = useQuery({
    queryKey: ['cashflow', 'projection', from, to],
    queryFn: () => fetchCashflowProjection({ from, to }),
  })

  const changeRange = (next: { from: string; to: string }) => {
    const nextFrom = next.from >= today ? next.from : today
    const nextTo = next.to > nextFrom ? next.to : addDays(nextFrom, DEFAULT_WINDOW_DAYS)
    setRange({ from: nextFrom, to: nextTo })
  }

  return (
    <div data-testid="dashboard-page">
      <PageHeader
        title={`Hola, ${user?.firstName ?? ''}`}
        description={
          summary.data
            ? `Resumen de ${formatMonth(summary.data.month)} · hoy ${formatLocalDate(summary.data.today)}`
            : 'Cargando resumen…'
        }
        actions={
          <Link
            to="/recomendador"
            className="inline-flex h-8 items-center gap-2 rounded-lg bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-700"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            ¿Qué tarjeta uso?
          </Link>
        }
      />

      {summary.isPending && <DashboardSkeleton />}
      {summary.isError && <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />}

      {summary.data && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardTitle>Efectivo disponible</CardTitle>
              <CardDescription>Cuentas que cuentan para tus decisiones</CardDescription>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                <MoneyDisplay cents={summary.data.cash.spendableBalance} />
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Total en {summary.data.cash.accountCount}{' '}
                {summary.data.cash.accountCount === 1 ? 'cuenta' : 'cuentas'}:{' '}
                <MoneyDisplay cents={summary.data.cash.totalBalance} className="font-medium" />
              </p>
            </Card>

            <Card>
              <CardTitle>Flujo mínimo proyectado</CardTitle>
              <CardDescription>
                {projection.data
                  ? `Del ${formatLocalDate(projection.data.from)} al ${formatLocalDate(projection.data.to)}`
                  : 'Proyección de tu efectivo'}
              </CardDescription>
              {projection.isPending && <Skeleton className="mt-3 h-8 w-32" />}
              {projection.isError && (
                <p className="mt-3 text-sm text-slate-500">No se pudo calcular el flujo.</p>
              )}
              {projection.data && (
                <>
                  <p className="mt-3 text-2xl font-semibold">
                    <MoneyDisplay cents={projection.data.minimum.balance} colored />
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    el {formatLocalDate(projection.data.minimum.date)} · colchón{' '}
                    <MoneyDisplay cents={projection.data.minCashBuffer} className="font-medium" />
                  </p>
                  <div className="mt-3">
                    {projection.data.belowBuffer ? (
                      <Badge tone="danger">Por debajo del colchón</Badge>
                    ) : (
                      <Badge tone="success">Dentro del colchón</Badge>
                    )}
                  </div>
                </>
              )}
            </Card>

            <Card>
              <CardTitle>Última recomendación</CardTitle>
              <CardDescription>Qué tarjeta te sugerimos usar</CardDescription>
              {summary.data.lastRecommendation ? (
                <div className="mt-3">
                  <p className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                    <Sparkles className="size-4 text-amber-500" aria-hidden="true" />
                    {summary.data.lastRecommendation.cardAlias
                      ? `${summary.data.lastRecommendation.cardAlias} ····${summary.data.lastRecommendation.last4}`
                      : summary.data.lastRecommendation.outcome === 'CASH'
                        ? 'Pagar con efectivo'
                        : 'Sin opción recomendada'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {summary.data.lastRecommendation.score !== null
                      ? `Puntaje ${summary.data.lastRecommendation.score} · `
                      : ''}
                    {formatLocalDate(summary.data.lastRecommendation.createdAt.slice(0, 10))}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  Aún no hay recomendaciones. En la siguiente fase podrás pedir una desde aquí.
                </p>
              )}
            </Card>
          </div>

          {projection.data && (
            <CashflowChart
              projection={projection.data}
              from={from}
              to={to}
              minDate={today}
              maxDate={addDays(from, MAX_WINDOW_DAYS)}
              onRangeChange={changeRange}
            />
          )}

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Tarjetas de crédito</CardTitle>
                <CardDescription>
                  Deuda total{' '}
                  <MoneyDisplay cents={summary.data.cards.totalDebt} className="font-medium" /> ·
                  disponible{' '}
                  <MoneyDisplay
                    cents={summary.data.cards.totalAvailableCredit}
                    className="font-medium"
                  />
                </CardDescription>
              </div>
              <CreditCard className="size-5 text-slate-400" aria-hidden="true" />
            </div>

            {summary.data.cards.items.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="Sin tarjetas registradas"
                  description="Cuando registres tarjetas verás aquí su utilización, cortes y pagos pendientes."
                />
              </div>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2" data-testid="dashboard-cards">
                {summary.data.cards.items.map((card) => (
                  <li key={card.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">
                        {card.alias} <span className="text-slate-400">····{card.last4}</span>
                      </p>
                      <span className="text-xs text-slate-500">
                        {(card.utilizationBps / 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          card.utilizationBps <= 3000
                            ? 'bg-emerald-500'
                            : card.utilizationBps <= 5000
                              ? 'bg-amber-500'
                              : 'bg-red-500',
                        )}
                        style={{ width: `${Math.min(card.utilizationBps / 100, 100)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Saldo <MoneyDisplay cents={card.currentBalance} className="font-medium" /> de{' '}
                      <MoneyDisplay cents={card.creditLimit} className="font-medium" />
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Corte {formatLocalDate(card.nextCutDate)} · pago{' '}
                      {formatLocalDate(card.nextDueDate)}
                    </p>
                    {card.pendingPayment > 0 && (
                      <p className="mt-2">
                        <Badge tone="warning">
                          Pago pendiente <MoneyDisplay cents={card.pendingPayment} />
                        </Badge>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardTitle>Próximos ingresos (30 días)</CardTitle>
              <CardDescription>
                Total estimado{' '}
                <MoneyDisplay cents={summary.data.upcomingIncome.total} className="font-medium" />
              </CardDescription>
              {summary.data.upcomingIncome.items.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No hay ingresos programados.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {summary.data.upcomingIncome.items.map((income) => (
                    <li
                      key={`${income.incomeScheduleId}-${income.date}`}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 truncate text-slate-600">
                        {income.name}
                        <span className="ml-2 text-xs text-slate-400">
                          {formatLocalDate(income.date)}
                        </span>
                      </span>
                      <MoneyDisplay cents={income.amount} className="font-medium text-emerald-600" />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardTitle>Próximos pagos (30 días)</CardTitle>
              <CardDescription>
                Total estimado{' '}
                <MoneyDisplay cents={summary.data.upcomingPayments.total} className="font-medium" />
              </CardDescription>
              {summary.data.upcomingPayments.items.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No hay pagos programados.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {summary.data.upcomingPayments.items.map((payment) => (
                    <li
                      key={`${payment.type}-${payment.description}-${payment.date}`}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 truncate text-slate-600">
                        <Badge tone="neutral" className="mr-2">
                          {PAYMENT_TYPES[payment.type] ?? payment.type}
                        </Badge>
                        {payment.description}
                        <span className="ml-2 text-xs text-slate-400">
                          {formatLocalDate(payment.date)}
                        </span>
                      </span>
                      <MoneyDisplay cents={payment.amount} className="font-medium text-red-600" />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card>
            <CardTitle>Gastos de {formatMonth(summary.data.expenses.month)}</CardTitle>
            <CardDescription>
              Mes anterior:{' '}
              <MoneyDisplay cents={summary.data.expenses.previousSpent} className="font-medium" />
            </CardDescription>
            <div className="mt-3 flex flex-wrap items-baseline gap-3">
              <p className="text-2xl font-semibold text-slate-900">
                <MoneyDisplay cents={summary.data.expenses.spent} />
              </p>
              {summary.data.expenses.previousSpent > 0 && (
                <DeltaBadge
                  current={summary.data.expenses.spent}
                  previous={summary.data.expenses.previousSpent}
                />
              )}
            </div>
            {summary.data.expenses.topCategories.length > 0 && (
              <ul className="mt-4 space-y-1.5" data-testid="dashboard-top-categories">
                {summary.data.expenses.topCategories.map((category) => (
                  <li
                    key={category.categoryId ?? 'sin-categoria'}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="truncate text-slate-600">
                      {category.name ?? 'Sin categoría'}
                    </span>
                    <MoneyDisplay cents={category.amount} className="font-medium text-slate-700" />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  const delta = Math.round(((current - previous) / previous) * 100)
  const up = delta > 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        up ? 'text-red-600' : 'text-emerald-600',
      )}
    >
      {up ? (
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      ) : (
        <ArrowDownRight className="size-3.5" aria-hidden="true" />
      )}
      {up ? '+' : ''}
      {delta}% vs mes anterior
    </span>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-40" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  )
}
