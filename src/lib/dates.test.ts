import { describe, expect, it } from 'vitest'
import { addDays, formatLocalDate, isValidTimeZone, todayInTimeZone } from './dates.ts'

describe('todayInTimeZone', () => {
  it('calcula la fecha local en la zona indicada, no en la del navegador', () => {
    const instant = new Date('2026-10-05T02:00:00.000Z')
    expect(todayInTimeZone('America/Mexico_City', instant)).toBe('2026-10-04')
    expect(todayInTimeZone('UTC', instant)).toBe('2026-10-05')
  })

  it('no truena y usa la zona por defecto cuando la guardada no existe', () => {
    // 2026-10-12T02:00Z todavía es 11 de octubre en México.
    const instant = new Date('2026-10-12T02:00:00.000Z')
    expect(todayInTimeZone('America/Mexico City', instant)).toBe('2026-10-11')
    expect(todayInTimeZone('Zona/Invalida', instant)).toBe('2026-10-11')
  })
})

describe('isValidTimeZone', () => {
  it('acepta zonas IANA y rechaza texto arbitrario', () => {
    expect(isValidTimeZone('America/Mexico_City')).toBe(true)
    expect(isValidTimeZone('UTC')).toBe(true)
    expect(isValidTimeZone('America/Mexico City')).toBe(false)
    expect(isValidTimeZone('No/Existe')).toBe(false)
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
