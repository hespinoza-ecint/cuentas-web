import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { invalidateFinancial } from './invalidate-financial.ts'

describe('invalidateFinancial', () => {
  it('invalida las colecciones financieras compartidas', () => {
    const queryClient = new QueryClient()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')

    invalidateFinancial(queryClient)

    const keys = spy.mock.calls.map(
      ([filters]) => (filters as { queryKey: unknown[] }).queryKey[0],
    )
    expect(keys).toEqual(
      expect.arrayContaining([
        'cashflow',
        'dashboard',
        'accounts',
        'movements',
        'statements',
        'cards',
        'payments',
        'purchases',
      ]),
    )
  })
})
