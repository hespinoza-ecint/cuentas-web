import { useEffect, useMemo, useState } from 'react'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
import { Card, CardDescription, CardTitle } from '../../components/ui/card.tsx'
import { formatLocalDate } from '../../lib/dates.ts'
import type { CashflowProjection } from './dashboard-api.ts'

/** Detecta pantallas angostas para dibujar la gráfica a escala legible. */
function useNarrowChart(): boolean {
  const [narrow, setNarrow] = useState(() => window.innerWidth < 640)

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return narrow
}

interface ChartPoint {
  date: string
  balance: number
}

const PADDING = { top: 16, right: 16, bottom: 26, left: 16 }

/** Gráfica ligera de flujo (SVG propio; sin dependencias de gráficas). */
export function CashflowChart({
  projection,
  from,
  to,
  minDate,
  maxDate,
  onRangeChange,
}: {
  projection: CashflowProjection
  from: string
  to: string
  minDate: string
  maxDate: string
  onRangeChange: (range: { from: string; to: string }) => void
}) {
  const narrow = useNarrowChart()
  const width = narrow ? 360 : 640
  const height = narrow ? 190 : 200

  const { path, areaPath, points, minPoint, zeroY, dateTicks } = useMemo(() => {
    const series: ChartPoint[] = [
      { date: projection.from, balance: projection.startingBalance },
      ...projection.points.map((point) => ({ date: point.date, balance: point.balance })),
    ]

    const balances = series.map((point) => point.balance)
    let min = Math.min(...balances, 0)
    let max = Math.max(...balances, 0)
    if (min === max) {
      min -= 1
      max += 1
    }

    const firstDate = toDay(series[0].date)
    const lastDate = toDay(series[series.length - 1].date)
    const span = Math.max(lastDate - firstDate, 1)

    const innerWidth = width - PADDING.left - PADDING.right
    const innerHeight = height - PADDING.top - PADDING.bottom

    const x = (date: string) => PADDING.left + ((toDay(date) - firstDate) / span) * innerWidth
    const y = (balance: number) =>
      PADDING.top + ((max - balance) / (max - min)) * innerHeight

    const coords = series.map((point) => ({ ...point, x: x(point.date), y: y(point.balance) }))
    const linePath = coords.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ')
    const baseline = y(Math.max(min, 0))
    const area = `${linePath} L${coords[coords.length - 1].x},${baseline} L${coords[0].x},${baseline} Z`
    const minimum = coords.reduce((best, point) => (point.balance < best.balance ? point : best), coords[0])

    // En pantallas angostas solo las fechas de los extremos (menos ruido).
    const ticks = narrow
      ? [coords[0], coords[coords.length - 1]]
      : [coords[0], coords[Math.floor(coords.length / 2)], coords[coords.length - 1]]

    return {
      path: linePath,
      areaPath: area,
      points: coords,
      minPoint: minimum,
      zeroY: y(0),
      dateTicks: ticks,
    }
  }, [projection, narrow, width, height])

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>Flujo de efectivo proyectado</CardTitle>
          <CardDescription>
            Del {formatLocalDate(projection.from)} al {formatLocalDate(projection.to)} · saldo inicial{' '}
            <MoneyDisplay cents={projection.startingBalance} className="font-medium" /> · mínimo{' '}
            <MoneyDisplay cents={projection.minimum.balance} className="font-medium" /> el{' '}
            {formatLocalDate(projection.minimum.date)}
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-0.5 text-xs font-medium text-ink-muted">
            Desde
            <input
              type="date"
              value={from}
              min={minDate}
              max={to}
              onChange={(event) => onRangeChange({ from: event.target.value, to })}
              className="rounded-lg border border-line-strong px-2 py-1 text-xs text-ink shadow-sm outline-none focus:border-focus focus:ring-2 focus:ring-focus/25"
            />
          </label>
          <label className="flex flex-col gap-0.5 text-xs font-medium text-ink-muted">
            Hasta
            <input
              type="date"
              value={to}
              min={from}
              max={maxDate}
              onChange={(event) => onRangeChange({ from, to: event.target.value })}
              className="rounded-lg border border-line-strong px-2 py-1 text-xs text-ink shadow-sm outline-none focus:border-focus focus:ring-2 focus:ring-focus/25"
            />
          </label>
        </div>
      </div>

      <svg
        role="img"
        aria-label="Flujo de efectivo proyectado"
        data-testid="cashflow-chart"
        viewBox={`0 0 ${width} ${height}`}
        className="mt-3 w-full"
      >
        {/* Línea de cero */}
        <line
          x1={PADDING.left}
          x2={width - PADDING.right}
          y1={zeroY}
          y2={zeroY}
          className="stroke-chart-grid"
          strokeDasharray="4 4"
        />
        <path d={areaPath} className="fill-chart-area" opacity="0.5" />
        <path d={path} fill="none" className="stroke-chart-line" strokeWidth="2" />
        {points.map((point) => (
          <circle key={point.date} cx={point.x} cy={point.y} r="3" className="fill-chart-line">
            <title>
              {formatLocalDate(point.date)}: {formatted(point.balance)}
            </title>
          </circle>
        ))}
        <circle cx={minPoint.x} cy={minPoint.y} r="4" className="fill-danger">
          <title>
            Mínimo {formatLocalDate(minPoint.date)}: {formatted(minPoint.balance)}
          </title>
        </circle>
        {dateTicks.map((tick, index) => (
          <text
            key={`${tick.date}-${index}`}
            x={Math.min(Math.max(tick.x, PADDING.left + 16), width - PADDING.right - 16)}
            y={height - 6}
            textAnchor="middle"
            className="fill-ink-muted"
            fontSize={narrow ? 11 : 10}
          >
            {formatLocalDate(tick.date)}
          </text>
        ))}
      </svg>

      {projection.points.length === 0 && (
        <p className="mt-2 text-xs text-ink-muted">
          No hay movimientos programados en la ventana; la línea es tu saldo actual.
        </p>
      )}
    </Card>
  )
}

function toDay(date: string): number {
  return new Date(`${date}T00:00:00Z`).getTime() / 86_400_000
}

function formatted(cents: number): string {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}
