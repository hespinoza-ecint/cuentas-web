import { describe, expect, it } from 'vitest'
import { readPurchasesFile } from './read-purchases-file.ts'

describe('readPurchasesFile', () => {
  it('rechaza archivos que no son .xlsx', async () => {
    const result = await readPurchasesFile(new File(['contenido'], 'compras.csv'))

    expect(result.rows).toEqual([])
    expect(result.error).toBe('El archivo debe ser un Excel (.xlsx).')
  })

  it('rechaza archivos mayores a 2 MB', async () => {
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'compras.xlsx')
    const result = await readPurchasesFile(big)

    expect(result.rows).toEqual([])
    expect(result.error).toBe('El archivo supera el limite de 2 MB.')
  })
})
