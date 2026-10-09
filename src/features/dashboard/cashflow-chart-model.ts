/**
 * Calculos puros de la grafica de flujo (fase 21).
 *
 * Separados del componente para poder probarlos sin DOM: la serie en
 * escalones (el saldo solo cambia los dias con movimientos), la escala
 * "bonita" del eje, las marcas de fecha, la franja de flujo y el resumen
 * de cada dia que alimenta el panel de detalle.
 */
import { addDays } from '../../lib/dates.ts'
import type { CashflowProjection } from './dashboard-api.ts'

const DAY_MS = 86_400_000

export interface ChartEvent {
  type: string
  description: string
  amount: number
}

export interface ChartDay {
  date: string
  /** Saldo antes de los movimientos del dia. */
  openBalance: number
  /** Saldo al cierre del dia (despues de sus movimientos). */
  balance: number
  inflows: number
  outflows: number
  events: ChartEvent[]
  /** `true` si el dia tiene movimientos programados. */
  isEventDay: boolean
}

/** Dias de calendario entre dos fechas `YYYY-MM-DD` (puede ser 0). */
export function daySpan(from: string, to: string): number {
  return Math.round(toDay(to) - toDay(from))
}

/**
 * Serie en escalones: inicia en `from` con el saldo inicial, los dias con
 * movimientos ajustan el saldo y termina en `to` aunque no haya movimientos,
 * para que la linea cubra toda la ventana elegida.
 */
export function buildDays(projection: CashflowProjection): ChartDay[] {
  const points = [...projection.points].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  const days: ChartDay[] = []
  let cursor = projection.startingBalance

  // Punto de partida: si `from` ya trae movimientos, ese dia es el primero.
  const first = points[0]
  if (!first || first.date !== projection.from) {
    days.push({
      date: projection.from,
      openBalance: projection.startingBalance,
      balance: projection.startingBalance,
      inflows: 0,
      outflows: 0,
      events: [],
      isEventDay: false,
    })
  }

  for (const [index, point] of points.entries()) {
    days.push({
      date: point.date,
      openBalance: index === 0 ? projection.startingBalance : cursor,
      balance: point.balance,
      inflows: point.inflows,
      outflows: point.outflows,
      events: point.events.map((event) => ({
        type: event.type,
        description: event.description,
        amount: event.amount,
      })),
      isEventDay: true,
    })
    cursor = point.balance
  }

  const last = days[days.length - 1]
  if (last.date !== projection.to) {
    days.push({
      date: projection.to,
      openBalance: cursor,
      balance: cursor,
      inflows: 0,
      outflows: 0,
      events: [],
      isEventDay: false,
    })
  }

  return days
}

/** Dia con el saldo mas bajo de la serie (ancla de la marca de minimo). */
export function lowestDay(days: ChartDay[]): ChartDay {
  return days.reduce((best, day) => (day.balance < best.balance ? day : best), days[0])
}

/**
 * Detalle de cualquier fecha de la ventana: si el dia no esta en la serie
 * (no tiene movimientos) se sintetiza con el saldo que arrastra el escalon.
 */
export function snapshotForDate(days: ChartDay[], date: string): ChartDay {
  const existing = days.find((day) => day.date === date)
  if (existing) {
    return existing
  }
  let balance = days[0].openBalance
  for (const day of days) {
    if (day.date <= date) {
      balance = day.balance
    } else {
      break
    }
  }
  return {
    date,
    openBalance: balance,
    balance,
    inflows: 0,
    outflows: 0,
    events: [],
    isEventDay: false,
  }
}

export interface YScale {
  min: number
  max: number
  ticks: number[]
}

/**
 * Escala Y "bonita" (pasos 1/2/2.5/5 x 10^n). El cero se incluye cuando los
 * saldos estan cerca de el (a menos de un rango) o cambian de signo, para no
 * comprimir la curva cuando el dinero vive lejos del cero.
 */
export function buildYScale(values: number[], targetTicks = 4): YScale {
  const finite = values.filter((value) => Number.isFinite(value))
  let rawMin = Math.min(...finite)
  let rawMax = Math.max(...finite)
  if (rawMin === rawMax) {
    rawMin -= 100
    rawMax += 100
  }

  const span = rawMax - rawMin
  const crossing = rawMin < 0 && rawMax > 0
  const includeZero = crossing || rawMin <= span || (rawMax < 0 && -rawMax <= span)

  const lo = includeZero ? Math.min(rawMin, 0) : rawMin
  const hi = includeZero ? Math.max(rawMax, 0) : rawMax
  const padLo = lo - (hi - lo) * 0.08
  const padHi = hi + (hi - lo) * 0.12
  const step = Math.max(100, niceStep((padHi - padLo) / targetTicks))
  const min = Math.floor(padLo / step) * step
  const max = Math.ceil(padHi / step) * step

  const ticks: number[] = []
  for (let value = min; value <= max + step / 2; value += step) {
    ticks.push(value)
  }
  return { min, max, ticks }
}

function niceStep(raw: number): number {
  const pow = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / pow
  const factor = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10
  return factor * pow
}

export interface StepSegment {
  path: string
  /** El tramo queda por debajo del colchon (se pinta como riesgo). */
  belowBuffer: boolean
}

/**
 * Segmentos de la curva en escalones: planos mientras no hay movimientos y
 * verticales el dia del movimiento. Cada segmento sabe si esta por debajo
 * del colchon para pintarlo en rojo.
 */
export function buildStepSegments(
  days: ChartDay[],
  xOf: (date: string) => number,
  yOf: (value: number) => number,
  buffer: number,
): StepSegment[] {
  const segments: StepSegment[] = []
  for (const [index, day] of days.entries()) {
    const yOpen = yOf(day.openBalance)
    const yClose = yOf(day.balance)
    if (Math.abs(yClose - yOpen) >= 0.05) {
      segments.push({
        path: `M${r(xOf(day.date))},${r(yOpen)}L${r(xOf(day.date))},${r(yClose)}`,
        belowBuffer: day.balance < buffer,
      })
    }
    const next = days[index + 1]
    if (next) {
      segments.push({
        path: `M${r(xOf(day.date))},${r(yClose)}L${r(xOf(next.date))},${r(yClose)}`,
        belowBuffer: day.balance < buffer,
      })
    }
  }
  return segments
}

/** Relleno de la escalera hasta la linea base (el cero o el fondo del area). */
export function buildAreaPath(
  days: ChartDay[],
  xOf: (date: string) => number,
  yOf: (value: number) => number,
  baselineY: number,
): string {
  const first = days[0]
  const lastDate = days[days.length - 1].date
  const parts = [`M${r(xOf(first.date))},${r(yOf(first.openBalance))}`]
  for (const [index, day] of days.entries()) {
    parts.push(`V${r(yOf(day.balance))}`)
    const next = days[index + 1]
    if (next) {
      parts.push(`H${r(xOf(next.date))}`)
    }
  }
  parts.push(`L${r(xOf(lastDate))},${r(baselineY)}`)
  parts.push(`L${r(xOf(first.date))},${r(baselineY)}`)
  parts.push('Z')
  return parts.join('')
}

/**
 * Trapecios entre la curva y la linea del colchon en los tramos por debajo:
 * muestran que tan hondo cae el saldo respecto al piso.
 */
export function buildBufferWedges(
  days: ChartDay[],
  xOf: (date: string) => number,
  yOf: (value: number) => number,
  buffer: number,
  bufferY: number,
): string[] {
  const wedges: string[] = []
  let start = -1

  const flush = (end: number) => {
    wedges.push(wedgePath(days, start, end, xOf, yOf, bufferY))
    start = -1
  }

  for (const [index, day] of days.entries()) {
    const below = day.balance < buffer
    if (below && start === -1) {
      start = index
    }
    if (!below && start !== -1) {
      flush(index - 1)
    }
  }
  if (start !== -1) {
    flush(days.length - 1)
  }
  return wedges
}

function wedgePath(
  days: ChartDay[],
  start: number,
  end: number,
  xOf: (date: string) => number,
  yOf: (value: number) => number,
  bufferY: number,
): string {
  const x = (index: number) => r(xOf(days[index].date))
  const y = (index: number) => r(yOf(days[index].balance))
  const parts = [`M${x(start)},${r(bufferY)}`, `L${x(start)},${y(start)}`]

  for (let index = start; index < end; index++) {
    parts.push(`L${x(index + 1)},${y(index)}`)
    if (Math.abs(y(index + 1) - y(index)) >= 0.05) {
      parts.push(`L${x(index + 1)},${y(index + 1)}`)
    }
  }

  // El tramo plano sigue debajo del colchon hasta el siguiente movimiento.
  const next = days[end + 1]
  if (next) {
    parts.push(`L${x(end + 1)},${y(end)}`, `L${x(end + 1)},${r(bufferY)}`)
  } else {
    parts.push(`L${x(end)},${r(bufferY)}`)
  }
  parts.push('Z')
  return parts.join('')
}

export interface DateTick {
  date: string
  /** Texto corto del eje: "12 oct" (ventanas cortas) o "ene 27". */
  label: string
}

/**
 * Marcas del eje X: los extremos siempre, mas marcas internas alineadas al
 * calendario (semanas o meses) que quepan en `maxTicks`.
 */
export function dateTicks(from: string, to: string, maxTicks: number): DateTick[] {
  const span = Math.max(daySpan(from, to), 1)
  const budget = Math.max(0, maxTicks - 2)
  let interior: string[] = []

  if (span <= 8) {
    for (let offset = 2; offset < span; offset += 2) {
      interior.push(addDays(from, offset))
    }
  } else if (span <= 45) {
    for (let offset = 7; offset < span; offset += 7) {
      interior.push(addDays(from, offset))
    }
  } else {
    const steps = [1, 2, 3, 6, 12, 24]
    let chosen = steps[0]
    for (const step of steps) {
      chosen = step
      const candidates = monthStarts(from, to, step)
      if (candidates.length <= Math.max(1, budget)) {
        break
      }
    }
    interior = monthStarts(from, to, chosen)
    while (interior.length > budget && budget > 0) {
      interior = interior.filter((_, index) => index % 2 === 0)
    }
    if (budget === 0) {
      interior = []
    }
  }

  if (interior.length > budget) {
    interior = trimEvenly(interior, budget)
  }

  const minGap = Math.max(2, Math.floor(span / 10))
  const dates = [from, ...interior, to].sort()
  const labelDay = span <= 45
  return dates
    .filter((date, index) => {
      if (index === 0 || index === dates.length - 1) {
        return true
      }
      return daySpan(from, date) >= minGap && daySpan(date, to) >= minGap
    })
    .map((date) => ({ date, label: tickLabel(date, labelDay, from) }))
}

function monthStarts(from: string, to: string, step: number): string[] {
  const [year, month] = from.split('-').map(Number)
  const result: string[] = []
  let index = year * 12 + (month - 1) + 1
  for (;;) {
    const date = monthStartOf(index)
    if (date >= to) {
      break
    }
    if (index % step === 0) {
      result.push(date)
    }
    index += 1
  }
  return result
}

function monthStartOf(monthIndex: number): string {
  const year = Math.floor(monthIndex / 12)
  const month = (monthIndex % 12) + 1
  return `${year}-${String(month).padStart(2, '0')}-01`
}

function trimEvenly(items: string[], keep: number): string[] {
  if (keep <= 0) {
    return []
  }
  if (items.length <= keep) {
    return items
  }
  if (keep === 1) {
    return [items[Math.floor((items.length - 1) / 2)]]
  }
  const result = new Set<string>()
  for (let index = 0; index < keep; index++) {
    result.add(items[Math.round((index * (items.length - 1)) / (keep - 1))])
  }
  return [...result]
}

const DAY_MONTH = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' })
const MONTH = new Intl.DateTimeFormat('es-MX', { month: 'short' })
const MONTH_YEAR = new Intl.DateTimeFormat('es-MX', { month: 'short', year: '2-digit' })

/** Texto corto de una marca del eje ("12 oct" o "ene 27"). */
export function tickLabel(date: string, labelDay: boolean, reference: string): string {
  // Mediodia UTC evita saltos de dia por la zona horaria del navegador.
  const midday = new Date(`${date}T12:00:00Z`)
  if (labelDay) {
    return DAY_MONTH.format(midday)
  }
  return date.slice(0, 4) === reference.slice(0, 4)
    ? MONTH.format(midday)
    : MONTH_YEAR.format(midday)
}

export interface FlowBucket {
  /** Etiqueta estable del bucket (fecha o mes `YYYY-MM`). */
  key: string
  startDate: string
  endDate: string
  inflows: number
  outflows: number
}

/**
 * Franja de flujo: un bucket por dia con movimientos en ventanas cortas y un
 * bucket por mes cuando la ventana es larga (para que la franja no se sature).
 */
export function buildFlowBuckets(days: ChartDay[], from: string, to: string): FlowBucket[] {
  const monthly = daySpan(from, to) > 120
  const buckets: FlowBucket[] = []

  for (const day of days) {
    if (day.inflows === 0 && day.outflows === 0) {
      continue
    }
    const key = monthly ? day.date.slice(0, 7) : day.date
    const last = buckets[buckets.length - 1]
    if (last && last.key === key && monthly) {
      last.inflows += day.inflows
      last.outflows += day.outflows
    } else {
      buckets.push({
        key,
        startDate: monthly ? monthBounds(key).start : day.date,
        endDate: monthly ? monthBounds(key).end : day.date,
        inflows: day.inflows,
        outflows: day.outflows,
      })
    }
  }

  // Recorta los meses a la ventana visible.
  return buckets.map((bucket) => ({
    ...bucket,
    startDate: bucket.startDate < from ? from : bucket.startDate,
    endDate: bucket.endDate > to ? to : bucket.endDate,
  }))
}

function monthBounds(month: string): { start: string; end: string } {
  const [year, number] = month.split('-').map(Number)
  const nextMonth = number === 12 ? `${year + 1}-01-01` : `${year}-${String(number + 1).padStart(2, '0')}-01`
  return { start: `${month}-01`, end: addDays(nextMonth, -1) }
}

/** Fechas que la grafica permite recorrer con el teclado (flechas). */
export function selectableDates(days: ChartDay[], today: string): string[] {
  const dates = new Set<string>()
  for (const day of days) {
    if (day.isEventDay) {
      dates.add(day.date)
    }
  }
  dates.add(days[0].date)
  dates.add(days[days.length - 1].date)
  if (today >= days[0].date && today <= days[days.length - 1].date) {
    dates.add(today)
  }
  return [...dates].sort()
}

/** Fecha del eje X a partir de la posicion horizontal del puntero. */
export function dateAtX(x: number, from: string, to: string, innerLeft: number, innerWidth: number): string {
  const span = Math.max(daySpan(from, to), 1)
  const ratio = Math.min(Math.max((x - innerLeft) / Math.max(innerWidth, 1), 0), 1)
  return addDays(from, Math.round(ratio * span))
}

const COMPACT_NUMBER = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 })

/** Etiqueta corta para el eje Y: 980000 → "$9.8 mil", 120000000 → "$1.2 M". */
export function compactCents(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  if (abs >= 100_000_000) {
    return `${sign}$${COMPACT_NUMBER.format(round1(abs / 100_000_000))} M`
  }
  if (abs >= 100_000) {
    const mil = round1(abs / 100_000)
    if (mil >= 1000) {
      return `${sign}$${COMPACT_NUMBER.format(round1(abs / 100_000_000))} M`
    }
    return `${sign}$${COMPACT_NUMBER.format(mil)} mil`
  }
  return `${sign}$${COMPACT_NUMBER.format(Math.round(abs / 100))}`
}

function toDay(date: string): number {
  return new Date(`${date}T00:00:00Z`).getTime() / DAY_MS
}

function r(value: number): number {
  return Math.round(value * 10) / 10
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}
