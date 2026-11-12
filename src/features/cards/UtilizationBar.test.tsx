import { describe, expect, it } from 'vitest'
import { utilizationLevel } from './utilization.ts'

describe('utilizationLevel', () => {
  it('usa el umbral configurado por el usuario (mismo nivel en todas las pantallas)', () => {
    expect(utilizationLevel(3000, 3000)).toEqual({ label: 'Uso bajo', tone: 'bg-success' })
    expect(utilizationLevel(3001, 3000).label).toBe('Uso medio')
    // 5000 = 3000 * 5/3: el borde superior de "uso medio".
    expect(utilizationLevel(5000, 3000).label).toBe('Uso medio')
    expect(utilizationLevel(5001, 3000).label).toBe('Uso alto')
  })

  it('respeta un umbral distinto al de fábrica', () => {
    expect(utilizationLevel(4000, 5000).label).toBe('Uso bajo')
    expect(utilizationLevel(6000, 5000).label).toBe('Uso medio')
  })
})
