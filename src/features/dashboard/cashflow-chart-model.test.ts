import { describe, expect, it } from 'vitest'
import type { CashflowProjection } from './dashboard-api.ts'
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
  tickLabel,
} from './cashflow-chart-model.ts'

function projection(overrides: Partial<CashflowProjection> = {}): CashflowProjection {
  return {
    today: '2026-10-05',
    from: '2026-10-05',
    to: '2026-11-04',
    timezone: 'America/Mexico_City',
    horizonDays: 30,
    startingBalance: 975000,
    minCashBuffer: 100000,
    points: [],
    minimum: { date: '2026-11-04', balance: 975000 },
    finalBalance: 975000,
    belowBuffer: false,
    ...overrides,
  }
}

const BONO = { date: '2026-10-10', inflows: 100000, outflows: 0, balance: 1075000, events: [{ type: 'INCOME', description: 'Bono', amount: 100000 }] }
const PAGO = { date: '2026-10-26', inflows: 0, outflows: 200000, balance: 875000, events: [{ type: 'CARD_STATEMENT', description: 'Pago Oro', amount: -200000 }] }

describe('buildDays', () => {
  it('extiende la ventana hasta `to` aunque no haya movimientos', () => {
    const days = buildDays(projection())
    expect(days).toHaveLength(2)
    expect(days[0]).toMatchObject({ date: '2026-10-05', balance: 975000, isEventDay: false })
    expect(days[1]).toMatchObject({ date: '2026-11-04', balance: 975000, isEventDay: false })
  })

  it('encadena el saldo entre dias con movimientos', () => {
    const days = buildDays(projection({ points: [BONO, PAGO], finalBalance: 875000 }))
    expect(days.map((day) => day.date)).toEqual(['2026-10-05', '2026-10-10', '2026-10-26', '2026-11-04'])
    expect(days[1]).toMatchObject({ openBalance: 975000, balance: 1075000, isEventDay: true })
    expect(days[2]).toMatchObject({ openBalance: 1075000, balance: 875000, events: [{ description: 'Pago Oro' }] })
    expect(days[3]).toMatchObject({ date: '2026-11-04', balance: 875000, isEventDay: false })
  })

  it('fusiona el movimiento del primer dia con el punto de partida', () => {
    const days = buildDays(projection({ points: [{ ...BONO, date: '2026-10-05' }], finalBalance: 1075000 }))
    expect(days[0]).toMatchObject({ date: '2026-10-05', openBalance: 975000, balance: 1075000, isEventDay: true })
    expect(days).toHaveLength(2)
  })

  it('no repite el cierre cuando el ultimo movimiento cae en `to`', () => {
    const days = buildDays(projection({ points: [{ ...PAGO, date: '2026-11-04' }], finalBalance: 875000 }))
    expect(days.map((day) => day.date)).toEqual(['2026-10-05', '2026-11-04'])
    expect(days[1]).toMatchObject({ isEventDay: true, balance: 875000 })
  })
})

describe('buildYScale', () => {
  it('incluye el cero cuando los saldos viven cerca de el', () => {
    const scale = buildYScale([975000, 100000])
    expect(scale.min).toBeLessThanOrEqual(0)
    expect(scale.ticks).toContain(0)
  })

  it('omite el cero cuando el saldo esta lejos (para no comprimir la curva)', () => {
    const scale = buildYScale([100_000_000, 95_000_000])
    expect(scale.min).toBeGreaterThan(0)
    expect(scale.max).toBeGreaterThanOrEqual(100_000_000)
  })

  it('incluye el cero cuando hay saldos negativos', () => {
    const scale = buildYScale([-50_000, 975000])
    expect(scale.min).toBeLessThan(0)
    expect(scale.ticks).toContain(0)
  })

  it('genera marcas ascendentes dentro del dominio', () => {
    const scale = buildYScale([975000, -50_000, 100000])
    expect(scale.ticks.length).toBeGreaterThanOrEqual(3)
    for (let index = 1; index < scale.ticks.length; index++) {
      expect(scale.ticks[index]).toBeGreaterThan(scale.ticks[index - 1])
    }
    expect(scale.ticks[0]).toBe(scale.min)
    expect(scale.ticks[scale.ticks.length - 1]).toBe(scale.max)
  })
})

describe('buildStepSegments', () => {
  const xOf = (date: string) => daySpan('2026-10-05', date)
  const yOf = (value: number) => value / 1000

  it('dibuja planos y verticales solo el dia del movimiento', () => {
    const days = buildDays(projection({ points: [BONO, PAGO], finalBalance: 875000 }))
    const segments = buildStepSegments(days, xOf, yOf, 100000)
    expect(segments).toEqual([
      { path: 'M0,975L5,975', belowBuffer: false },
      { path: 'M5,975L5,1075', belowBuffer: false },
      { path: 'M5,1075L21,1075', belowBuffer: false },
      { path: 'M21,1075L21,875', belowBuffer: false },
      { path: 'M21,875L30,875', belowBuffer: false },
    ])
  })

  it('marca los tramos por debajo del colchon (incluida la caida)', () => {
    const days = buildDays(projection({ points: [BONO, PAGO], finalBalance: 875000 }))
    const segments = buildStepSegments(days, xOf, yOf, 900000)
    expect(segments.find((segment) => segment.path === 'M21,1075L21,875')?.belowBuffer).toBe(true)
    expect(segments.find((segment) => segment.path === 'M21,875L30,875')?.belowBuffer).toBe(true)
    expect(segments.find((segment) => segment.path === 'M5,1075L21,1075')?.belowBuffer).toBe(false)
  })
})

describe('buildAreaPath', () => {
  it('cierra el area sobre la linea base', () => {
    const days = buildDays(projection({ points: [BONO, PAGO], finalBalance: 875000 }))
    const xOf = (date: string) => daySpan('2026-10-05', date)
    const yOf = (value: number) => value / 1000
    expect(buildAreaPath(days, xOf, yOf, 1000)).toBe('M0,975V975H5V1075H21V875H30V875L30,1000L0,1000Z')
  })
})

describe('buildBufferWedges', () => {
  const xOf = (date: string) => daySpan('2026-10-05', date)
  const yOf = (value: number) => value / 1000

  it('genera un trapecio por cada tramo debajo del colchon', () => {
    const days = buildDays(
      projection({
        points: [
          { date: '2026-10-10', inflows: 0, outflows: 925000, balance: 50000, events: [] },
          { date: '2026-10-15', inflows: 250000, outflows: 0, balance: 300000, events: [] },
          { date: '2026-10-26', inflows: 0, outflows: 310000, balance: -10000, events: [] },
        ],
        finalBalance: -10000,
      }),
    )
    const wedges = buildBufferWedges(days, xOf, yOf, 100000, 100)
    expect(wedges).toEqual(['M5,100L5,50L10,50L10,100Z', 'M21,100L21,-10L30,-10L30,100Z'])
  })

  it('no genera trapecios si el saldo nunca baja del colchon', () => {
    const days = buildDays(projection({ points: [BONO, PAGO], finalBalance: 875000 }))
    expect(buildBufferWedges(days, xOf, yOf, 100000, 100)).toEqual([])
  })
})

describe('dateTicks', () => {
  it('etiqueta semanas en ventanas cortas y respeta los extremos', () => {
    const ticks = dateTicks('2026-10-05', '2026-11-04', 6)
    expect(ticks.length).toBeLessThanOrEqual(6)
    expect(ticks[0]).toEqual({ date: '2026-10-05', label: '5 oct' })
    expect(ticks[ticks.length - 1]).toEqual({ date: '2026-11-04', label: '4 nov' })
    expect(ticks.map((tick) => tick.date)).toEqual([...ticks.map((tick) => tick.date)].sort())
  })

  it('etiqueta meses (con año al cambiar) en ventanas largas', () => {
    const ticks = dateTicks('2026-10-05', '2027-01-03', 6)
    expect(ticks.map((tick) => tick.label)).toEqual(['oct', 'nov', 'dic', 'ene 27'])
  })

  it('recorta marcas pegadas a las orillas', () => {
    const ticks = dateTicks('2026-10-05', '2026-11-04', 4)
    expect(ticks.length).toBeLessThanOrEqual(4)
    expect(ticks[0].date).toBe('2026-10-05')
    expect(ticks[ticks.length - 1].date).toBe('2026-11-04')
  })

  it('cabe en ventanas de varios años', () => {
    const ticks = dateTicks('2026-10-05', '2031-10-04', 6)
    expect(ticks.length).toBeLessThanOrEqual(6)
    expect(ticks.length).toBeGreaterThanOrEqual(3)
  })

  it('formatea etiquetas por dia o por mes', () => {
    expect(tickLabel('2026-10-12', true, '2026-10-05')).toBe('12 oct')
    expect(tickLabel('2026-11-01', false, '2026-10-05')).toBe('nov')
    expect(tickLabel('2027-01-01', false, '2026-10-05')).toBe('ene 27')
  })
})

describe('buildFlowBuckets', () => {
  it('usa un bucket por dia en ventanas cortas', () => {
    const days = buildDays(projection({ points: [BONO, PAGO], finalBalance: 875000 }))
    const buckets = buildFlowBuckets(days, '2026-10-05', '2026-11-04')
    expect(buckets).toEqual([
      { key: '2026-10-10', startDate: '2026-10-10', endDate: '2026-10-10', inflows: 100000, outflows: 0 },
      { key: '2026-10-26', startDate: '2026-10-26', endDate: '2026-10-26', inflows: 0, outflows: 200000 },
    ])
  })

  it('agrupa por mes en ventanas largas', () => {
    const days = buildDays(
      projection({
        from: '2026-01-01',
        to: '2026-12-31',
        points: [
          { date: '2026-01-15', inflows: 100000, outflows: 0, balance: 1075000, events: [] },
          { date: '2026-01-28', inflows: 0, outflows: 50000, balance: 1025000, events: [] },
          { date: '2026-02-10', inflows: 0, outflows: 25000, balance: 1000000, events: [] },
        ],
        finalBalance: 1000000,
      }),
    )
    const buckets = buildFlowBuckets(days, '2026-01-01', '2026-12-31')
    expect(buckets).toHaveLength(2)
    expect(buckets[0]).toEqual({
      key: '2026-01',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      inflows: 100000,
      outflows: 50000,
    })
    expect(buckets[1].key).toBe('2026-02')
    expect(buckets[1].outflows).toBe(25000)
  })
})

describe('selectableDates', () => {
  it('incluye extremos, dias con movimientos y hoy', () => {
    const days = buildDays(projection({ points: [BONO, PAGO], finalBalance: 875000 }))
    expect(selectableDates(days, '2026-10-05')).toEqual(['2026-10-05', '2026-10-10', '2026-10-26', '2026-11-04'])
    expect(selectableDates(days, '2026-10-20')).toEqual([
      '2026-10-05',
      '2026-10-10',
      '2026-10-20',
      '2026-10-26',
      '2026-11-04',
    ])
  })
})

describe('dateAtX', () => {
  it('convierte la posicion del puntero en fecha y respeta los limites', () => {
    expect(dateAtX(14, '2026-10-05', '2026-11-04', 14, 300)).toBe('2026-10-05')
    expect(dateAtX(164, '2026-10-05', '2026-11-04', 14, 300)).toBe('2026-10-20')
    expect(dateAtX(314, '2026-10-05', '2026-11-04', 14, 300)).toBe('2026-11-04')
    expect(dateAtX(999, '2026-10-05', '2026-11-04', 14, 300)).toBe('2026-11-04')
  })
})

describe('lowestDay', () => {
  it('encuentra el dia con el saldo mas bajo', () => {
    const days = buildDays(projection({ points: [BONO, PAGO], finalBalance: 875000 }))
    expect(lowestDay(days).date).toBe('2026-10-26')
  })
})

describe('snapshotForDate', () => {
  it('devuelve el dia de la serie cuando existe', () => {
    const days = buildDays(projection({ points: [BONO, PAGO], finalBalance: 875000 }))
    expect(snapshotForDate(days, '2026-10-10')).toBe(days.find((day) => day.date === '2026-10-10'))
  })

  it('sintetiza un dia sin movimientos con el saldo que arrastra el escalon', () => {
    const days = buildDays(projection({ points: [BONO, PAGO], finalBalance: 875000 }))
    expect(snapshotForDate(days, '2026-10-18')).toMatchObject({
      date: '2026-10-18',
      balance: 1075000,
      isEventDay: false,
      events: [],
    })
    // Antes del primer movimiento el saldo es el inicial.
    expect(snapshotForDate(days, '2026-10-07')).toMatchObject({ balance: 975000 })
  })
})

describe('compactCents', () => {
  it('abrevia montos del eje segun su magnitud', () => {
    expect(compactCents(0)).toBe('$0')
    expect(compactCents(95000)).toBe('$950')
    expect(compactCents(980000)).toBe('$9.8 mil')
    expect(compactCents(-980000)).toBe('-$9.8 mil')
    expect(compactCents(120000000)).toBe('$1.2 M')
    expect(compactCents(999_999_99)).toBe('$1 M')
  })
})
