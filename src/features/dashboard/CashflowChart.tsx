import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card, CardDescription, CardTitle } from '../../components/ui/card.tsx'
import { controlClass } from '../../components/ui/control.ts'
import { addDays, formatLocalDate } from '../../lib/dates.ts'
import { formatCents } from '../../lib/money.ts'
import { cn } from '../../lib/utils.ts'
import { CashflowDayDetail } from './CashflowDayDetail.tsx'
import {
  buildAreaPath,
  buildBufferWedges,
  buildDays,
  buildFlowBuckets,
  buildStepSegments,
  buildYScale,
  compactCents,
  dateAtX,
  dateTicks,
  daySpan,
  lowestDay,
  selectableDates,
  snapshotForDate,
} from './cashflow-chart-model.ts'
import type { CashflowProjection } from './dashboard-api.ts'

/** Margenes internos del SVG (el eje Y etiqueta arriba de cada linea). */
const PADDING = { top: 18, right: 14, bottom: 22, left: 14 }
const STRIP_GAP = 8
/** Ancho de respaldo cuando el contenedor aun no se puede medir. */
const FALLBACK_WIDTH = 640
const MIN_WIDTH = 288
/** Dibuja un punto por dia con movimiento solo si no saturan la curva. */
const MAX_DOTS = 60

const WINDOWS = [
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
  { label: '6 meses', days: 182 },
  { label: '1 año', days: 365 },
] as const

const INSTRUCTIONS_ID = 'cashflow-chart-instructions'

/**
 * Grafica de flujo en escalones (SVG propio, sin dependencias): el saldo se
 * mantiene plano y salta el dia del movimiento. Dibuja el colchon, los
 * tramos por debajo de el, una franja de ingresos/gastos por dia y un panel
 * de detalle que responde a toque, mouse y teclado.
 */
export function CashflowChart({
  projection,
  from,
  to,
  minDate,
  maxDate,
  onRangeChange,
  isStale = false,
}: {
  projection: CashflowProjection
  /** Rango elegido (los campos de fecha); la proyeccion puede venir atrasada. */
  from: string
  to: string
  minDate: string
  maxDate: string
  onRangeChange: (range: { from: string; to: string }) => void
  /** `true` mientras llega una proyeccion nueva (se atenúa el contenido). */
  isStale?: boolean
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [measuredWidth, setMeasuredWidth] = useState(FALLBACK_WIDTH)
  const [requested, setRequested] = useState<string | null>(null)

  useEffect(() => {
    const element = wrapperRef.current
    if (!element) return
    const measure = () => {
      const next = element.getBoundingClientRect().width
      if (next > 40) {
        setMeasuredWidth(next)
      }
    }
    measure()
    if (typeof ResizeObserver === 'undefined') {
      return
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const width = Math.max(measuredWidth, MIN_WIDTH)
  const narrow = width < 480
  const plotHeight = narrow ? 148 : 182
  const stripHeight = narrow ? 24 : 28
  const innerWidth = width - PADDING.left - PADDING.right
  const plotTop = PADDING.top
  const plotBottom = plotTop + plotHeight
  const stripTop = plotBottom + STRIP_GAP
  const stripBottom = stripTop + stripHeight
  const height = stripBottom + PADDING.bottom

  const days = useMemo(() => buildDays(projection), [projection])

  const geometry = useMemo(() => {
    const span = Math.max(daySpan(projection.from, projection.to), 1)
    const xOf = (date: string) => PADDING.left + (daySpan(projection.from, date) / span) * innerWidth
    const scale = buildYScale(
      [
        projection.startingBalance,
        projection.minCashBuffer,
        projection.finalBalance,
        ...days.flatMap((day) => [day.openBalance, day.balance]),
      ],
      narrow ? 3 : 4,
    )
    const yOf = (value: number) =>
      plotTop + ((scale.max - value) / (scale.max - scale.min)) * plotHeight
    const zeroInDomain = scale.min <= 0 && scale.max >= 0
    const baselineY = zeroInDomain ? yOf(0) : plotBottom

    const maxTicks = Math.max(2, Math.floor(innerWidth / (narrow ? 82 : 96)))
    const buckets = buildFlowBuckets(days, projection.from, projection.to)
    const maxFlow = Math.max(1, ...buckets.map((bucket) => Math.max(bucket.inflows, bucket.outflows)))
    const halfStrip = stripHeight / 2 - 1
    const bars = buckets.map((bucket) => {
      const single = bucket.startDate === bucket.endDate
      const x1 = xOf(bucket.startDate)
      const x2 = xOf(bucket.endDate)
      const barWidth = single
        ? Math.min(10, Math.max(2.5, (innerWidth / span) * 0.6))
        : Math.min(16, Math.max(3, (x2 - x1) * 0.55))
      const center = single ? x1 : (x1 + x2) / 2
      return {
        key: bucket.key,
        x: center - barWidth / 2,
        width: barWidth,
        inflowsHeight: (bucket.inflows / maxFlow) * halfStrip,
        outflowsHeight: (bucket.outflows / maxFlow) * halfStrip,
      }
    })

    const eventDays = days.filter((day) => day.isEventDay)
    const todayInWindow =
      projection.today > projection.from && projection.today <= projection.to
    return {
      span,
      xOf,
      yOf,
      scale,
      baselineY,
      bufferY: yOf(projection.minCashBuffer),
      segments: buildStepSegments(days, xOf, yOf, projection.minCashBuffer),
      areaPath: buildAreaPath(days, xOf, yOf, baselineY),
      wedges: buildBufferWedges(days, xOf, yOf, projection.minCashBuffer, yOf(projection.minCashBuffer)),
      ticks: dateTicks(projection.from, projection.to, maxTicks),
      bars,
      stripCenter: stripTop + stripHeight / 2,
      showDots: eventDays.length <= MAX_DOTS,
      dots: eventDays.map((day) => ({ date: day.date, x: xOf(day.date), y: yOf(day.balance), balance: day.balance })),
      lowest: lowestDay(days),
      selectable: selectableDates(days, projection.today),
      todayX: todayInWindow ? xOf(projection.today) : null,
    }
  }, [days, projection, narrow, innerWidth, plotHeight, plotTop, plotBottom, stripHeight, stripTop])

  const { xOf, yOf } = geometry
  const minimum = projection.minimum.date
  const firstDate = days[0].date
  const lastDate = days[days.length - 1].date
  const defaultDate = minimum < firstDate ? firstDate : minimum > lastDate ? lastDate : minimum
  const selectedDate = requested ?? defaultDate
  const selectedDay = snapshotForDate(days, selectedDate)

  const liveSummary = selectedDay.isEventDay
    ? `${formatLocalDate(selectedDay.date)}: saldo ${formatCents(selectedDay.balance)}, entradas ${formatCents(selectedDay.inflows)}, salidas ${formatCents(selectedDay.outflows)}, ${selectedDay.events.length} movimiento${selectedDay.events.length === 1 ? '' : 's'}.`
    : `${formatLocalDate(selectedDay.date)}: saldo ${formatCents(selectedDay.balance)}, sin movimientos.`

  const selectDay = (date: string) => {
    setRequested((previous) => (previous === date ? previous : date))
  }

  const selectFromPointer = (clientX: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    const localX = ((clientX - rect.left) / rect.width) * width
    selectDay(dateAtX(localX, projection.from, projection.to, PADDING.left, innerWidth))
  }

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId)
    // El clic/tacto tambien enfoca la grafica: las flechas siguen funcionando.
    wrapperRef.current?.focus({ preventScroll: true })
    selectFromPointer(event.clientX)
  }

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (event.buttons > 0) {
      selectFromPointer(event.clientX)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const dates = geometry.selectable
    let next: string | null = null
    if (event.key === 'ArrowRight') {
      next = dates.find((date) => date > selectedDate) ?? dates[dates.length - 1]
    } else if (event.key === 'ArrowLeft') {
      next = [...dates].reverse().find((date) => date < selectedDate) ?? dates[0]
    } else if (event.key === 'Home') {
      next = dates[0]
    } else if (event.key === 'End') {
      next = dates[dates.length - 1]
    }
    if (next) {
      event.preventDefault()
      selectDay(next)
    }
  }

  const delta = projection.finalBalance - projection.startingBalance

  return (
    <Card aria-busy={isStale || undefined}>
      <div className={cn('transition-opacity duration-200', isStale && 'opacity-60')}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>Flujo de efectivo proyectado</CardTitle>
            <CardDescription>
              Del {formatLocalDate(projection.from)} al {formatLocalDate(projection.to)}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div role="group" aria-label="Ventanas rápidas" className="flex flex-wrap gap-1.5">
              {WINDOWS.map((window) => {
                const active = from === minDate && to === addDays(minDate, window.days)
                return (
                  <Button
                    key={window.label}
                    variant="secondary"
                    size="sm"
                    aria-pressed={active}
                    className={cn(active && 'border-brand-ink bg-brand-soft text-brand-ink')}
                    onClick={() => onRangeChange({ from: minDate, to: addDays(minDate, window.days) })}
                  >
                    {window.label}
                  </Button>
                )
              })}
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-0.5 text-2xs font-medium text-ink-muted sm:text-xs">
                Desde
                <input
                  type="date"
                  value={from}
                  min={minDate}
                  max={to}
                  onChange={(event) => onRangeChange({ from: event.target.value, to })}
                  className={controlClass({ className: 'w-auto px-2 py-1 text-xs' })}
                />
              </label>
              <label className="flex flex-col gap-0.5 text-2xs font-medium text-ink-muted sm:text-xs">
                Hasta
                <input
                  type="date"
                  value={to}
                  min={from}
                  max={maxDate}
                  onChange={(event) => onRangeChange({ from, to: event.target.value })}
                  className={controlClass({ className: 'w-auto px-2 py-1 text-xs' })}
                />
              </label>
            </div>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          <div>
            <dt className="text-2xs text-ink-muted sm:text-xs">Saldo inicial</dt>
            <dd className="text-sm font-semibold text-ink tabular-nums sm:text-base">
              <MoneyDisplay cents={projection.startingBalance} />
            </dd>
          </div>
          <div>
            <dt className="text-2xs text-ink-muted sm:text-xs">Mínimo proyectado</dt>
            <dd className="text-sm font-semibold tabular-nums sm:text-base">
              <MoneyDisplay cents={projection.minimum.balance} colored />
            </dd>
            <p className="text-2xs text-ink-muted">{formatLocalDate(projection.minimum.date)}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-2xs text-ink-muted sm:text-xs">Saldo final</dt>
            <dd className="text-sm font-semibold text-ink tabular-nums sm:text-base">
              <MoneyDisplay cents={projection.finalBalance} />
            </dd>
            {delta !== 0 && (
              <p className="text-2xs">
                <span className={cn('font-medium', delta > 0 ? 'text-income' : 'text-expense')}>
                  {delta > 0 ? '+' : ''}
                  {formatCents(delta)}
                </span>
                <span className="text-ink-muted"> vs inicio</span>
              </p>
            )}
          </div>
        </dl>

        <div
          ref={wrapperRef}
          role="group"
          aria-label="Flujo de efectivo proyectado"
          aria-describedby={INSTRUCTIONS_ID}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="mt-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <p id={INSTRUCTIONS_ID} className="sr-only">
            Usa las flechas izquierda y derecha para recorrer los días con movimientos; el detalle
            del día seleccionado aparece abajo.
          </p>
          <p role="status" className="sr-only">
            {liveSummary}
          </p>

          <svg
            ref={svgRef}
            key={`${projection.from}-${projection.to}`}
            data-testid="cashflow-chart"
            viewBox={`0 0 ${width} ${height}`}
            aria-hidden="true"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            className="w-full cursor-crosshair touch-pan-y select-none"
          >
            {/* Rejilla y cero */}
            {geometry.scale.ticks.map((value) => (
              <line
                key={value}
                x1={PADDING.left}
                x2={width - PADDING.right}
                y1={yOf(value)}
                y2={yOf(value)}
                className="stroke-chart-grid"
                strokeOpacity={value === 0 ? 0.9 : 0.45}
                strokeWidth={value === 0 ? 1 : 0.75}
                strokeDasharray={value === 0 ? '4 4' : undefined}
              />
            ))}

            {/* Area bajo la curva */}
            <path d={geometry.areaPath} className="fill-chart-area" opacity={0.55} />

            {/* Zonas por debajo del colchon */}
            {geometry.wedges.map((wedge, index) => (
              <path key={index} d={wedge} className="fill-danger" fillOpacity={0.22} />
            ))}

            {/* Guia del dia seleccionado */}
            <line
              x1={xOf(selectedDay.date)}
              x2={xOf(selectedDay.date)}
              y1={plotTop}
              y2={plotBottom}
              className="stroke-ink-muted"
              strokeOpacity={0.35}
              strokeWidth={1}
            />

            {/* Linea del colchon */}
            <line
              x1={PADDING.left}
              x2={width - PADDING.right}
              y1={geometry.bufferY}
              y2={geometry.bufferY}
              className="stroke-warning"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />

            {/* Hoy */}
            {geometry.todayX !== null && (
              <line
                x1={geometry.todayX}
                x2={geometry.todayX}
                y1={plotTop}
                y2={plotBottom}
                className="stroke-ink-muted"
                strokeOpacity={0.45}
                strokeWidth={1}
                strokeDasharray="2 3"
              />
            )}

            {/* Curva en escalones */}
            {geometry.segments.map((segment, index) => (
              <path
                key={index}
                d={segment.path}
                pathLength={1}
                fill="none"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={cn('chart-draw', segment.belowBuffer ? 'stroke-danger' : 'stroke-chart-line')}
              />
            ))}

            {/* Etiquetas sobre la curva (con halo para no perderse entre lineas) */}
            {geometry.scale.ticks.map((value) => (
              <text
                key={value}
                x={PADDING.left + 2}
                y={yOf(value) - 3}
                fontSize="10"
                className="fill-ink-muted stroke-surface"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {compactCents(value)}
              </text>
            ))}
            <text
              x={width - PADDING.right - 2}
              y={geometry.bufferY - 4}
              textAnchor="end"
              fontSize="10"
              className="fill-warning stroke-surface"
              strokeWidth={3}
              paintOrder="stroke"
            >
              Colchón
            </text>
            {geometry.todayX !== null && (
              <text
                x={Math.min(Math.max(geometry.todayX, PADDING.left + 14), width - PADDING.right - 14)}
                y={plotTop + 10}
                textAnchor="middle"
                fontSize="10"
                className="fill-ink-muted stroke-surface"
                strokeWidth={3}
                paintOrder="stroke"
              >
                Hoy
              </text>
            )}

            {/* Movimientos y minimo */}
            {geometry.showDots &&
              geometry.dots.map((dot) => (
                <circle key={dot.date} cx={dot.x} cy={dot.y} r={2.5} className="fill-chart-line">
                  <title>
                    {formatLocalDate(dot.date)}: {formatCents(dot.balance)}
                  </title>
                </circle>
              ))}
            <circle
              cx={xOf(geometry.lowest.date)}
              cy={yOf(geometry.lowest.balance)}
              r={3.5}
              className="fill-danger stroke-surface"
              strokeWidth={1.5}
            >
              <title>
                Mínimo {formatLocalDate(geometry.lowest.date)}: {formatCents(geometry.lowest.balance)}
              </title>
            </circle>
            {selectedDay.date !== geometry.lowest.date && (
              <circle
                cx={xOf(selectedDay.date)}
                cy={yOf(selectedDay.balance)}
                r={3}
                className="fill-chart-line stroke-surface"
                strokeWidth={1.5}
              />
            )}
            <circle
              cx={xOf(selectedDay.date)}
              cy={yOf(selectedDay.balance)}
              r={6}
              fill="none"
              strokeWidth={2}
              className="stroke-chart-line"
            >
              <title>
                {formatLocalDate(selectedDay.date)}: {formatCents(selectedDay.balance)}
              </title>
            </circle>

            {/* Franja de flujo diario */}
            <line
              x1={PADDING.left}
              x2={width - PADDING.right}
              y1={geometry.stripCenter}
              y2={geometry.stripCenter}
              className="stroke-chart-grid"
              strokeOpacity={0.7}
            />
            {geometry.bars.map((bar) => (
              <g key={bar.key}>
                {bar.inflowsHeight > 0.5 && (
                  <rect
                    x={bar.x}
                    y={geometry.stripCenter - bar.inflowsHeight}
                    width={bar.width}
                    height={bar.inflowsHeight}
                    rx={1}
                    className="fill-income"
                    opacity={0.85}
                  />
                )}
                {bar.outflowsHeight > 0.5 && (
                  <rect
                    x={bar.x}
                    y={geometry.stripCenter}
                    width={bar.width}
                    height={bar.outflowsHeight}
                    rx={1}
                    className="fill-expense"
                    opacity={0.85}
                  />
                )}
              </g>
            ))}

            {/* Fechas */}
            {geometry.ticks.map((tick) => (
              <text
                key={tick.date}
                x={Math.min(Math.max(xOf(tick.date), PADDING.left + 16), width - PADDING.right - 16)}
                y={height - 6}
                textAnchor="middle"
                fontSize="10"
                className="fill-ink-muted stroke-surface"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {tick.label}
              </text>
            ))}
          </svg>
        </div>

        <p className="mt-1 text-2xs text-ink-muted sm:text-xs">
          Franja inferior: ingresos y gastos por día · línea punteada ámbar: colchón
          {projection.belowBuffer && ' · los tramos rojos caen debajo del colchón'}
        </p>

        {projection.points.length === 0 && (
          <p className="mt-1 text-xs text-ink-muted">
            No hay movimientos programados en la ventana; la línea es tu saldo actual.
          </p>
        )}

        <CashflowDayDetail
          day={selectedDay}
          today={projection.today}
          buffer={projection.minCashBuffer}
        />

        <details className="mt-2">
          <summary className="w-fit cursor-pointer rounded text-xs font-medium text-ink-muted hover:text-ink-secondary">
            Ver como tabla
          </summary>
          <div className="mt-2 overflow-x-auto">
            <table data-testid="cashflow-table" className="w-full text-left text-xs">
              <caption className="sr-only">Flujo de efectivo proyectado por día</caption>
              <thead>
                <tr className="text-ink-muted">
                  <th scope="col" className="py-1 pr-2 font-medium">
                    Fecha
                  </th>
                  <th scope="col" className="py-1 pr-2 text-right font-medium">
                    Entradas
                  </th>
                  <th scope="col" className="py-1 pr-2 text-right font-medium">
                    Salidas
                  </th>
                  <th scope="col" className="py-1 text-right font-medium">
                    Saldo
                  </th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day.date} className="border-t border-line">
                    <td className="py-1 pr-2 text-ink-secondary">{formatLocalDate(day.date)}</td>
                    <td className="py-1 pr-2 text-right tabular-nums">
                      {day.inflows > 0 ? (
                        <span className="text-income">{formatCents(day.inflows)}</span>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="py-1 pr-2 text-right tabular-nums">
                      {day.outflows > 0 ? (
                        <span className="text-expense">{formatCents(day.outflows)}</span>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>
                    <td
                      className={cn(
                        'py-1 text-right font-medium tabular-nums',
                        day.balance < 0 ? 'text-expense' : 'text-ink',
                      )}
                    >
                      {formatCents(day.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </Card>
  )
}
