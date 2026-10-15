import { describe, expect, it, vi } from 'vitest'
import { readPurchasesFile } from './read-purchases-file.ts'

const { readSheetMock } = vi.hoisted(() => ({ readSheetMock: vi.fn() }))

vi.mock('read-excel-file/browser', () => ({
  readSheet: readSheetMock,
}))

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

  it('lee la primera hoja y la convierte en filas', async () => {
    readSheetMock.mockResolvedValueOnce([
      ['Fecha', 'Descripción', 'Compras'],
      ['04 Oct 2026', 'Uber', '$ 89.97'],
      ['', '', ''],
    ])

    const result = await readPurchasesFile(new File(['x'], 'compras.xlsx'))

    expect(result.error).toBeNull()
    expect(result.rows).toEqual([
      { line: 2, purchaseDate: '2026-10-04', description: 'Uber', amount: 8997 },
    ])
  })

  it('rechaza archivos con mas de 500 filas', async () => {
    const rows: unknown[][] = [['Fecha', 'Descripción', 'Compras']]
    for (let index = 0; index < 501; index++) {
      rows.push(['01 Oct 2026', `Compra ${index}`, '$ 1.00'])
    }
    readSheetMock.mockResolvedValueOnce(rows)

    const result = await readPurchasesFile(new File(['x'], 'compras.xlsx'))

    expect(result.rows).toEqual([])
    expect(result.error).toBe(
      'El archivo tiene 501 filas; el maximo es 500. Divide el estado de cuenta.',
    )
  })
})
