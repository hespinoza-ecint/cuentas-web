import { describe, expect, it } from 'vitest'
import { formatCents, parsePesosToCents } from './money.ts'

describe('parsePesosToCents', () => {
  it('convierte pesos a centavos sin errores de punto flotante', () => {
    expect(parsePesosToCents('1234.56')).toBe(123456)
    expect(parsePesosToCents('$1,234.56')).toBe(123456)
    expect(parsePesosToCents('0.1')).toBe(10)
    expect(parsePesosToCents('0.01')).toBe(1)
    expect(parsePesosToCents('100')).toBe(10000)
    expect(parsePesosToCents('-25.5')).toBe(-2550)
    expect(parsePesosToCents(' 1,000,000.99 ')).toBe(100000099)
  })

  it('rechaza entradas invalidas', () => {
    expect(parsePesosToCents('')).toBeNull()
    expect(parsePesosToCents('1.234')).toBeNull()
    expect(parsePesosToCents('abc')).toBeNull()
    expect(parsePesosToCents('1,2,3')).toBeNull()
    expect(parsePesosToCents('1.2.3')).toBeNull()
    expect(parsePesosToCents('--5')).toBeNull()
  })
})

describe('formatCents', () => {
  it('formatea montos en pesos mexicanos', () => {
    expect(formatCents(123456)).toContain('1,234.56')
    expect(formatCents(-500)).toContain('5.00')
    expect(formatCents(0)).toContain('0.00')
  })
})
