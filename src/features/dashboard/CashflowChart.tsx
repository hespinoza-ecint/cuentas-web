import { useMemo } from 'react'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay.tsx'
import { Card, CardDescription, CardTitle } from '../../components/ui/card.tsx'
import { formatLocalDate } from '../../lib/dates.ts'
import type { CashflowProjection } from './dashboard-api.ts'

const WIDTH = 640
const HEIGHT = 200
const PADDING = { top: 16, right: 16, bottom: 24, left: 16 }

interface ChartPoint {
  date: string
  balance: number
}

/** Gráfica ligera de flujo (SVG propio; sin dependencias de gráficas). */
export function CashflowChart({ projection }: { projection: CashflowProjection }) {
  const { path, areaPath, points, minPoint, zeroY, dateTicks } = useMemo(() => {
    const series: ChartPoint[] = [
      { date: projection.today, balance: projection.startingBalance },
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

    const innerWidth = WIDTH - PADDING.left - PADDING.right
    const innerHeight = HEIGHT - PADDING.top - PADDING.bottom

    const x = (date: string) => PADDING.left + ((toDay(date) - firstDate) / span) * innerWidth
    const y = (balance: number) =>
      PADDING.top + ((max - balance) / (max - min)) * innerHeight

    const coords = series.map((point) => ({ ...point, x: x(point.date), y: y(point.balance) }))
    const linePath = coords.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ')
    const baseline = y(Math.max(min, 0))
    const area = `${linePath} L${coords[coords.length - 1].x},${baseline} L${coords[0].x},${baseline} Z`
    const minimum = coords.reduce((best, point) => (point.balance < best.balance ? point : best), coords[0])

    const ticks = [coords[0], coords[Math.floor(coords.length / 2)], coords[coords.length - 1]]

    return {
      path: linePath,
      areaPath: area,
      points: coords,
      minPoint: minimum,
      zeroY: y(0),
      dateTicks: ticks,
    }
  }, [projection])

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Flujo de efectivo proyectado</CardTitle>
          <CardDescription>
            Próximos {projection.horizonDays} días · saldo inicial{' '}
            <MoneyDisplay cents={projection.startingBalance} className="font-medium" /> · mínimo{' '}
            <MoneyDisplay cents={projection.minimum.balance} className="font-medium" /> el{' '}
            {formatLocalDate(projection.minimum.date)}
          </CardDescription>
        </div>
      </div>

      <svg
        role="img"
        aria-label="Flujo de efectivo proyectado"
        data-testid="cashflow-chart"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-3 w-full"
      >
        {/* Línea de cero */}
        <line
          x1={PADDING.left}
          x2={WIDTH - PADDING.right}
          y1={zeroY}
          y2={zeroY}
          stroke="#cbd5e1"
          strokeDasharray="4 4"
        />
        <path d={areaPath} fill="#bae6fd" opacity="0.5" />
        <path d={path} fill="none" stroke="#0284c7" strokeWidth="2" />
        {points.map((point) => (
          <circle key={point.date} cx={point.x} cy={point.y} r="3" fill="#0284c7">
            <title>
              {formatLocalDate(point.date)}: {formatted(point.balance)}
            </title>
          </circle>
        ))}
        <circle cx={minPoint.x} cy={minPoint.y} r="4" fill="#dc2626">
          <title>
            Mínimo {formatLocalDate(minPoint.date)}: {formatted(minPoint.balance)}
          </title>
        </circle>
        {dateTicks.map((tick, index) => (
          <text
            key={`${tick.date}-${index}`}
            x={Math.min(Math.max(tick.x, PADDING.left + 16), WIDTH - PADDING.right - 16)}
            y={HEIGHT - 6}
            textAnchor="middle"
            className="fill-slate-400"
            fontSize="10"
          >
            {formatLocalDate(tick.date)}
          </text>
        ))}
      </svg>

      {projection.points.length === 0 && (
        <p className="mt-2 text-xs text-slate-500">
          No hay movimientos programados en el horizonte; la línea es tu saldo actual.
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
