import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { formatLocalDate } from '../../lib/dates.ts'
import type { ChartDay } from './cashflow-chart-model.ts'

const EVENT_TYPES: Record<string, string> = {
  INCOME: 'Ingreso',
  RECURRING_EXPENSE: 'Recurrente',
  CARD_STATEMENT: 'Corte',
  INSTALLMENT: 'Mensualidad',
  ANNUAL_FEE: 'Anualidad',
}

const MAX_EVENTS = 4

/**
 * Detalle del dia seleccionado en la grafica: funciona igual con toque,
 * mouse y teclado (las flechas mueven la seleccion).
 */
export function CashflowDayDetail({
  day,
  today,
  buffer,
}: {
  day: ChartDay
  /** "Hoy" en la zona del usuario (el mismo dia que marca la grafica). */
  today: string
  /** Colchon minimo de efectivo (debajo de el, el dia se marca en rojo). */
  buffer: number
}) {
  const hiddenEvents = day.events.length - MAX_EVENTS

  return (
    <div
      data-testid="cashflow-day-detail"
      className="mt-3 rounded-lg border border-line bg-surface-subtle px-3 py-2.5"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="text-sm font-semibold text-ink">{formatLocalDate(day.date)}</p>
        {day.date === today && <Badge tone="info">Hoy</Badge>}
        <p className="ml-auto text-xs text-ink-muted">
          Saldo al cierre{' '}
          <MoneyDisplay
            cents={day.balance}
            colored={day.balance < 0}
            className="font-semibold"
          />
        </p>
      </div>

      {day.isEventDay ? (
        <>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
            <span className="inline-flex items-center gap-1 text-income">
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
              Entradas <MoneyDisplay cents={day.inflows} className="font-medium" />
            </span>
            <span className="inline-flex items-center gap-1 text-expense">
              <ArrowDownRight className="size-3.5" aria-hidden="true" />
              Salidas <MoneyDisplay cents={day.outflows} className="font-medium" />
            </span>
            {day.balance < buffer && <span className="font-medium text-danger">Debajo del colchón</span>}
          </p>

          <ul className="mt-2 space-y-1">
            {day.events.slice(0, MAX_EVENTS).map((event, index) => (
              <li
                key={`${event.type}-${index}`}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span className="min-w-0 truncate text-ink-secondary">
                  {`${EVENT_TYPES[event.type] ?? event.type} · ${event.description}`}
                </span>
                <MoneyDisplay cents={event.amount} colored className="font-medium" />
              </li>
            ))}
          </ul>
          {hiddenEvents > 0 && (
            <p className="mt-1 text-xs text-ink-muted">
              y {hiddenEvents} movimiento{hiddenEvents === 1 ? '' : 's'} más
            </p>
          )}
        </>
      ) : (
        <p className="mt-1 text-xs text-ink-muted">
          Sin movimientos: el saldo se mantiene hasta el siguiente movimiento.
        </p>
      )}
    </div>
  )
}
