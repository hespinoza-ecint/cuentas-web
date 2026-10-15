import { describe, expect, it } from 'vitest'
import { parsePurchaseRows } from './parse-purchase-rows.ts'

const HEADER = ['Fecha', 'Descripción', 'Compras']

describe('parsePurchaseRows', () => {
  it('lee el formato del estado de cuenta (celdas de texto)', () => {
    const result = parsePurchaseRows([
      HEADER,
      ['04 Oct 2026', 'UBER * PENDING.UBER.COM AMSTERDAM NL', '$ 89.97'],
      ['30 Sep 2026', 'PAYPAL*PPCINEPOLIS OPM 150323DI1MX', '$ 104.00'],
      ['14 Sep 2026', 'ABARR ASTROS DIEZ JUPB560404LT5MX', '$ 5,676.00'],
      [],
      ['', '', ''],
    ])

    expect(result.error).toBeNull()
    expect(result.rows).toEqual([
      {
        line: 2,
        purchaseDate: '2026-10-04',
        description: 'UBER * PENDING.UBER.COM AMSTERDAM NL',
        amount: 8997,
      },
      {
        line: 3,
        purchaseDate: '2026-09-30',
        description: 'PAYPAL*PPCINEPOLIS OPM 150323DI1MX',
        amount: 10400,
      },
      {
        line: 4,
        purchaseDate: '2026-09-14',
        description: 'ABARR ASTROS DIEZ JUPB560404LT5MX',
        amount: 567600,
      },
    ])
  })

  it('acepta fechas nativas de Excel, numeros de serie y dd/mm/aaaa', () => {
    const serial = Math.round((Date.UTC(2026, 9, 4) - Date.UTC(1899, 11, 30)) / 86_400_000)
    const result = parsePurchaseRows([
      ['fecha', 'nombre', 'monto'],
      [new Date(Date.UTC(2026, 9, 4)), 'Compra A', 1234.56],
      [serial, 'Compra B', '1,200.71'],
      ['15/09/2026', 'Compra C', 100],
    ])

    expect(result.rows).toEqual([
      { line: 2, purchaseDate: '2026-10-04', description: 'Compra A', amount: 123456 },
      { line: 3, purchaseDate: '2026-10-04', description: 'Compra B', amount: 120071 },
      { line: 4, purchaseDate: '2026-09-15', description: 'Compra C', amount: 10000 },
    ])
  })

  it('reconoce el encabezado sin importar acentos ni el orden (hasta 10 filas)', () => {
    const result = parsePurchaseRows([
      ['Estado de cuenta'],
      ['FECHA', 'CONCEPTO', 'IMPORTE'],
      ['04 Oct 2026', 'Uber', '$ 89.97'],
    ])

    expect(result.error).toBeNull()
    expect(result.rows).toEqual([
      { line: 3, purchaseDate: '2026-10-04', description: 'Uber', amount: 8997 },
    ])
  })

  it('marca los abonos y filas ilegibles con su motivo', () => {
    const result = parsePurchaseRows([
      HEADER,
      ['02 Oct 2026', 'Comision anual', '-$ 120.00'],
      ['', 'Sin fecha', '$ 10.00'],
      ['01 Oct 2026', '', '$ 10.00'],
      ['01 Oct 2026', 'Monto raro', 'N/A'],
      ['01 Oct 2026', 'Descripcion larga', '$ 1.00'],
    ])

    expect(result.rows[0]).toMatchObject({
      line: 2,
      error: 'No es un cargo (monto cero o negativo).',
    })
    expect(result.rows[1]).toMatchObject({ line: 3, error: 'No se reconocio la fecha.' })
    expect(result.rows[2]).toMatchObject({
      line: 4,
      error: 'La fila no tiene nombre o descripcion.',
    })
    expect(result.rows[3]).toMatchObject({ line: 5, error: 'No se reconocio el monto.' })
    expect(result.rows[4]).toMatchObject({ line: 6, description: 'Descripcion larga', amount: 100 })
  })

  it('recorta descripciones de mas de 200 caracteres', () => {
    const long = 'x'.repeat(250)
    const result = parsePurchaseRows([HEADER, ['04 Oct 2026', long, '$ 10.00']])

    expect(result.rows[0].description).toBe('x'.repeat(200))
  })

  it('falla a nivel de archivo si no encuentra el encabezado', () => {
    const result = parsePurchaseRows([
      ['columna a', 'columna b', 'columna c'],
      ['1', '2', '3'],
    ])

    expect(result.rows).toEqual([])
    expect(result.error).toBe(
      'No se encontraron las columnas Fecha, Descripcion y Monto en el archivo.',
    )
  })
})
