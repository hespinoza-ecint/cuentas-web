import { describe, expect, it } from 'vitest'
import { addDays, formatLocalDate, todayInTimeZone } from './dates.ts'

describe('todayInTimeZone', () => {
  it('calcula la fecha local en la zona indicada, no en la del navegador', () => {
    const instant = new Date('2026-10-05T02:00:00.000Z')
    expect(todayInTimeZone('America/Mexico_City', instant)).toBe('2026-10-04')
    expect(todayInTimeZone('UTC', instant)).toBe('2026-10-05')
  })
})

describe('addDays', () => {
  it('suma dias de calendario', () => {
    expect(addDays('2026-10-05', 3)).toBe('2026-10-08')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })
})

describe('formatLocalDate', () => {
  it('muestra la fecha sin desfase por zona horaria', () => {
    expect(formatLocalDate('2026-10-05')).toContain('2026')
    expect(formatLocalDate('2026-10-05')).toContain('5')
  })
})
