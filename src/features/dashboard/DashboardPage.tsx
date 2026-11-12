import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  CreditCard,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
import { ErrorState } from '../../components/shared/ErrorState.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button.tsx'
import { ButtonLink } from '../../components/ui/button-link.tsx'
import { Card, CardDescription, CardTitle } from '../../components/ui/card.tsx'
import { EmptyState } from '../../components/ui/empty-state.tsx'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { Skeleton } from '../../components/ui/skeleton.tsx'
import { addDays, dayDiff, formatLocalDate, formatMonth, relativeDay } from '../../lib/dates.ts'
import { cn } from '../../lib/utils.ts'
import { useSessionUser } from '../auth/use-session.ts'
import { UtilizationBar } from '../cards/UtilizationBar.tsx'
import { utilizationLevel } from '../cards/utilization.ts'
import { useSettings, useToday } from '../users/use-settings.ts'
import { CashflowChart } from './CashflowChart.tsx'
import { fetchCashflowProjection, fetchDashboardSummary } from './dashboard-api.ts'

const PAYMENT_TYPES: Record<string, string> = {
  RECURRING_EXPENSE: 'Recurrente',
  CARD_STATEMENT: 'Corte',
  INSTALLMENT: 'Mensualidad',
  ANNUAL_FEE: 'Anualidad',
}

/** Pagos visibles antes de "Ver los N pagos". */
const PAYMENTS_PREVIEW = 4

/** Ventana por defecto de la proyeccion: hoy a hoy + 30 dias. */
const DEFAULT_WINDOW_DAYS = 30
/** Tope de la ventana (el backend tambien lo valida). */
const MAX_WINDOW_DAYS = 1825

export function DashboardPage() {
  const user = useSessionUser()
  const today = useToday()
  // La utilización máxima del usuario define las bandas del semáforo.
  const maxUtilizationBps = useSettings().data?.maxUtilizationBps ?? 3000
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
    // Al cambiar el rango, conserva la proyeccion anterior mientras llega la
    // nueva: la tarjeta (y sus campos de fecha) no se desmonta ni parpadea.
    placeholderData: keepPreviousData,
  })

  const [showAllPayments, setShowAllPayments] = useState(false)
  const payments = [...(summary.data?.upcomingPayments.items ?? [])].sort((a, b) =>
    a.date.localeCompare(b.date),
  )
  const weekEnd = addDays(summary.data?.today ?? today, 7)
  const weekTotal = payments
    .filter((payment) => payment.date <= weekEnd)
    .reduce((sum, payment) => sum + payment.amount, 0)
  // La tarjeta que vence antes va primero.
  const cardsByDueDate = [...(summary.data?.cards.items ?? [])].sort((a, b) =>
    a.nextDueDate.localeCompare(b.nextDueDate),
  )
  // Sin cuentas ni tarjetas el resumen serian ceros: se muestra por donde empezar.
  const isFirstRun =
    summary.data?.cash.accountCount === 0 && summary.data.cards.items.length === 0

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
      />

      {summary.isPending && <DashboardSkeleton />}
      {summary.isError && <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />}

      {summary.data && isFirstRun && <FirstRunSteps />}

      {summary.data && !isFirstRun && (
        <div className="space-y-4">
          {/* Lo primero: cuanto tengo, si me alcanza y que pago. */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardTitle>Efectivo disponible</CardTitle>
              <CardDescription>Cuentas que cuentan para tus decisiones</CardDescription>
              {/* Unica cifra grande de la pantalla. */}
              <p className="mt-3 text-3xl font-semibold tracking-tight text-ink tabular-nums">
                <MoneyDisplay cents={summary.data.cash.spendableBalance} />
              </p>
              {summary.data.cash.totalBalance !== summary.data.cash.spendableBalance && (
                <p className="mt-1 text-xs text-ink-muted">
                  Total en {summary.data.cash.accountCount}{' '}
                  {summary.data.cash.accountCount === 1 ? 'cuenta' : 'cuentas'}:{' '}
                  <MoneyDisplay cents={summary.data.cash.totalBalance} className="font-medium" />
                </p>
              )}

              <div className="mt-4 border-t border-line pt-3">
                {projection.isPending && <Skeleton className="h-10 w-48" />}
                {projection.isError && (
                  <div className="space-y-2">
                    <p className="text-sm text-ink-muted">No se pudo calcular el flujo.</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void projection.refetch()}
                    >
                      Reintentar
                    </Button>
                  </div>
                )}
                {projection.data && (
                  <>
                    <p className="text-sm text-ink-secondary">
                      Mínimo proyectado{' '}
                      <MoneyDisplay
                        cents={projection.data.minimum.balance}
                        className={cn(
                          'font-semibold',
                          projection.data.belowBuffer ? 'text-danger' : 'text-ink',
                        )}
                      />{' '}
                      <span className="text-xs text-ink-muted">
                        el {formatLocalDate(projection.data.minimum.date)}
                      </span>
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {projection.data.belowBuffer ? (
                        <>
                          <Badge tone="danger">
                            <TriangleAlert className="mr-1 size-3.5" aria-hidden="true" />
                            Por debajo del colchón
                          </Badge>
                          <span className="text-xs text-ink-muted">
                            faltan{' '}
                            <MoneyDisplay
                              cents={projection.data.minCashBuffer - projection.data.minimum.balance}
                              className="font-medium text-danger"
                            />
                          </span>
                        </>
                      ) : projection.data.minCashBuffer > 0 ? (
                        <>
                          <Badge tone="success">
                            <ShieldCheck className="mr-1 size-3.5" aria-hidden="true" />
                            Dentro del colchón
                          </Badge>
                          <span className="text-xs text-ink-muted">
                            margen{' '}
                            <MoneyDisplay
                              cents={projection.data.minimum.balance - projection.data.minCashBuffer}
                              className="font-medium text-ink"
                            />
                          </span>
                        </>
                      ) : (
                        // Sin colchon definido el aviso no dice nada: se invita a definirlo.
                        <Link
                          to="/configuracion"
                          className="inline-flex min-h-11 items-center text-xs font-medium text-brand-ink underline"
                        >
                          Define tu colchón
                        </Link>
                      )}
                      <a
                        href="#flujo"
                        className="inline-flex min-h-11 items-center text-xs font-medium text-brand-ink underline"
                      >
                        Ver flujo
                      </a>
                    </div>
                  </>
                )}
              </div>
            </Card>

            <Card>
              <CardTitle>Próximos pagos</CardTitle>
              {/* Los totales son parte del dato, no una nota al pie. */}
              <CardDescription className="text-sm text-ink-secondary">
                {summary.data.upcomingPayments.horizonDays} días · total{' '}
                <MoneyDisplay cents={summary.data.upcomingPayments.total} className="font-medium" />
                {weekTotal > 0 && (
                  <>
                    {' '}
                    · en 7 días <MoneyDisplay cents={weekTotal} className="font-medium" />
                  </>
                )}
              </CardDescription>
              {payments.length === 0 ? (
                <p className="mt-3 text-sm text-ink-muted">No hay pagos programados.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line" data-testid="dashboard-payments">
                  {(showAllPayments ? payments : payments.slice(0, PAYMENTS_PREVIEW)).map((payment) => (
                    <li
                      key={`${payment.type}-${payment.description}-${payment.date}`}
                      className="flex items-center justify-between gap-3 py-2 text-sm"
                    >
                      {/* Dos lineas: la fecha de pago nunca se recorta con la descripcion. */}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-ink-secondary">
                          {payment.description}
                        </span>
                        <span className="block text-xs text-ink-muted">
                          {PAYMENT_TYPES[payment.type] ?? payment.type} ·{' '}
                          {formatLocalDate(payment.date)} ·{' '}
                          {relativeDay(dayDiff(summary.data.today, payment.date))}
                        </span>
                      </span>
                      <MoneyDisplay cents={payment.amount} className="font-medium text-expense" />
                    </li>
                  ))}
                </ul>
              )}
              {payments.length > PAYMENTS_PREVIEW && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 -ml-3"
                  aria-expanded={showAllPayments}
                  onClick={() => setShowAllPayments((value) => !value)}
                >
                  {showAllPayments ? 'Ver menos' : `Ver los ${payments.length} pagos`}
                </Button>
              )}
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Tarjetas de crédito</CardTitle>
                <CardDescription className="text-sm text-ink-secondary">
                  Deuda total{' '}
                  <MoneyDisplay cents={summary.data.cards.totalDebt} className="font-medium" /> ·
                  disponible{' '}
                  <MoneyDisplay
                    cents={summary.data.cards.totalAvailableCredit}
                    className="font-medium"
                  />
                </CardDescription>
              </div>
              <CreditCard className="size-5 text-ink-muted" aria-hidden="true" />
            </div>

            {summary.data.cards.items.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="Sin tarjetas registradas"
                  description="Cuando registres tarjetas verás aquí su utilización, cortes y pagos pendientes."
                  action={
                    <ButtonLink to="/tarjetas" variant="secondary">
                      Ir a Tarjetas
                    </ButtonLink>
                  }
                />
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-line" data-testid="dashboard-cards">
                {cardsByDueDate.map((card) => {
                  const level = utilizationLevel(card.utilizationBps, maxUtilizationBps)
                  return (
                    <li key={card.id} className="py-1 first:pt-0 last:pb-0">
                      {/* La fila entera abre el detalle de la tarjeta. */}
                      <Link
                        to={`/tarjetas/${card.id}`}
                        className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-2 transition active:bg-surface-subtle"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-medium text-ink">
                              {card.alias} <span className="text-ink-muted">····{card.last4}</span>
                            </span>
                            <span className="shrink-0 text-sm font-medium text-ink tabular-nums">
                              {(card.utilizationBps / 100).toFixed(1)}%
                            </span>
                          </span>
                          <UtilizationBar
                            bps={card.utilizationBps}
                            maxUtilizationBps={maxUtilizationBps}
                            label={`Utilización de ${card.alias}`}
                            className="mt-2"
                          />
                          <span className="mt-2 block text-xs text-ink-muted">
                            {level.label} · saldo{' '}
                            <MoneyDisplay cents={card.currentBalance} className="font-medium" /> de{' '}
                            <MoneyDisplay cents={card.creditLimit} className="font-medium" />
                          </span>
                          {card.pendingPayment > 0 ? (
                            <span className="mt-1 block text-xs text-ink-secondary">
                              Paga{' '}
                              <MoneyDisplay
                                cents={card.pendingPayment}
                                className="font-semibold text-ink"
                              />{' '}
                              antes del {formatLocalDate(card.nextDueDate)} ·{' '}
                              {relativeDay(dayDiff(summary.data.today, card.nextDueDate))}
                            </span>
                          ) : (
                            <span className="mt-1 block text-xs text-ink-muted">
                              Corte {formatLocalDate(card.nextCutDate)} · pago{' '}
                              {formatLocalDate(card.nextDueDate)}
                            </span>
                          )}
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          {projection.data && (
            // Ancla de "Ver flujo"; el margen compensa la cabecera fija.
            <div id="flujo" className="scroll-mt-20">
              <CashflowChart
                projection={projection.data}
                from={from}
                to={to}
                minDate={today}
                maxDate={addDays(from, MAX_WINDOW_DAYS)}
                onRangeChange={changeRange}
                isStale={projection.isPlaceholderData}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardTitle>Gastos de {formatMonth(summary.data.expenses.month)}</CardTitle>
              <CardDescription>
                Mes anterior:{' '}
                <MoneyDisplay cents={summary.data.expenses.previousSpent} className="font-medium" />
              </CardDescription>
              <div className="mt-3 flex flex-wrap items-baseline gap-3">
                <p className="text-2xl font-semibold text-ink tabular-nums">
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
                      <span className="truncate text-ink-secondary">
                        {category.name ?? 'Sin categoría'}
                      </span>
                      <MoneyDisplay cents={category.amount} className="font-medium text-ink-secondary" />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardTitle>Próximos ingresos (30 días)</CardTitle>
              <CardDescription>
                Total estimado{' '}
                <MoneyDisplay cents={summary.data.upcomingIncome.total} className="font-medium" />
              </CardDescription>
              {summary.data.upcomingIncome.items.length === 0 ? (
                <p className="mt-3 text-sm text-ink-muted">No hay ingresos programados.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line">
                  {summary.data.upcomingIncome.items.slice(0, 6).map((income) => (
                    <li
                      key={`${income.incomeScheduleId}-${income.date}`}
                      className="flex items-center justify-between gap-3 py-2 text-sm"
                    >
                      {/* Dos lineas: el nombre no se come la fecha (igual que en pagos). */}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-ink-secondary">{income.name}</span>
                        <span className="block text-xs text-ink-muted">
                          {formatLocalDate(income.date)}
                        </span>
                      </span>
                      <MoneyDisplay cents={income.amount} className="font-medium text-income" />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* El recomendador tambien vive en el "+": aqui va al final, no en el tercer lugar. */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <CardTitle>¿Con qué tarjeta pago?</CardTitle>
                <CardDescription>
                  {summary.data.lastRecommendation
                    ? 'Última recomendación:'
                    : 'Compara tus tarjetas antes de comprar.'}
                </CardDescription>
                {summary.data.lastRecommendation && (
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-lg font-semibold text-ink">
                    <Sparkles className="size-4 text-brand-ink" aria-hidden="true" />
                    {summary.data.lastRecommendation.cardAlias
                      ? `${summary.data.lastRecommendation.cardAlias} ····${summary.data.lastRecommendation.last4}`
                      : summary.data.lastRecommendation.outcome === 'CASH'
                        ? 'Pagar con efectivo'
                        : 'Sin opción recomendada'}
                    <span className="text-xs font-normal text-ink-muted">
                      {summary.data.lastRecommendation.score !== null
                        ? `Puntaje ${summary.data.lastRecommendation.score} · `
                        : ''}
                      {formatLocalDate(
                        summary.data.lastRecommendation.createdAt.slice(0, 10),
                      )}
                    </span>
                  </p>
                )}
              </div>
              <ButtonLink to="/recomendador" size="sm">
                <Sparkles className="size-4" aria-hidden="true" />
                {summary.data.lastRecommendation ? 'Volver a recomendar' : 'Recomendar ahora'}
              </ButtonLink>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

const FIRST_RUN_STEPS = [
  {
    to: '/cuentas',
    title: 'Crea una cuenta de efectivo',
    description: 'Débito, efectivo o ahorro, con su saldo de hoy.',
  },
  {
    to: '/tarjetas',
    title: 'Registra tus tarjetas',
    description: 'Con su día de corte y su fecha límite de pago.',
  },
  {
    to: '/configuracion',
    title: 'Define tu colchón',
    description: 'El mínimo de efectivo que no quieres tocar.',
  },
]

/** Primer uso: tres pasos en lugar de un tablero lleno de ceros. */
function FirstRunSteps() {
  return (
    <Card>
      <CardTitle>Empieza por aquí</CardTitle>
      <CardDescription>Tres pasos para ver tu flujo y tus próximos pagos.</CardDescription>
      <ol className="mt-3 divide-y divide-line">
        {FIRST_RUN_STEPS.map((step, index) => (
          <li key={step.to}>
            <Link to={step.to} className="flex min-h-14 items-center gap-3 py-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-ink">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">{step.title}</span>
                <span className="block text-xs text-ink-muted">{step.description}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  )
}

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  const delta = Math.round(((current - previous) / previous) * 100)
  const up = delta > 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        up ? 'text-danger' : 'text-income',
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
      <Skeleton className="h-24" />
      <Skeleton className="h-32" />
      <Skeleton className="h-40" />
    </div>
  )
}
