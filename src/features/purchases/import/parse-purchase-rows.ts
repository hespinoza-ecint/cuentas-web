import { parsePesosToCents } from '../../../lib/money.ts'

/** Fila del archivo tal como se leyo, con lo que falto o fallo. */
export interface ParsedPurchaseRow {
  /** Numero de fila en la hoja (1-based, como lo muestra Excel). */
  line: number
  purchaseDate?: string
  description?: string
  /** Monto en centavos; solo si la fila es un cargo valido. */
  amount?: number
  /** Motivo por el que la fila no se puede importar. */
  error?: string
}

export interface ParsedPurchaseFile {
  /** Filas con datos (las vacias se omiten). */
  rows: ParsedPurchaseRow[]
  /** Error de archivo (encabezado no reconocido, por ejemplo). */
  error: string | null
}

const HEADER_ALIASES = {
  date: ['fecha'],
  description: ['descripcion', 'nombre', 'concepto', 'comercio'],
  amount: ['compras', 'monto', 'cantidad', 'importe', 'cargo'],
}

/** Primeras 3 letras del mes en espanol o ingles -> numero de mes. */
const MONTHS: Record<string, number> = {
  ene: 1,
  feb: 2,
  mar: 3,
  abr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dic: 12,
  jan: 1,
  apr: 4,
  aug: 8,
  dec: 12,
}

const MAX_HEADER_SCAN = 10

/** Quita acentos y mayusculas: "Descripción" -> "descripcion". */
function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function formatParts(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }
  const check = new Date(Date.UTC(year, month - 1, day))
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null
  }
  return `${year}-${pad(month)}-${pad(day)}`
}

/** Numero de serie de Excel (dias desde 1899-12-30). */
function fromExcelSerial(serial: number): string | null {
  const date = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86_400_000)
  return formatParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

function parseDateCell(cell: unknown): string | null {
  if (cell instanceof Date) {
    return formatParts(cell.getUTCFullYear(), cell.getUTCMonth() + 1, cell.getUTCDate())
  }
  if (typeof cell === 'number') {
    return fromExcelSerial(cell)
  }
  const text = String(cell ?? '').trim()
  if (!text) {
    return null
  }

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text)
  if (iso) {
    return formatParts(Number(iso[1]), Number(iso[2]), Number(iso[3]))
  }

  // dd/mm/aaaa (formato mexicano).
  const slash = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text)
  if (slash) {
    return formatParts(Number(slash[3]), Number(slash[2]), Number(slash[1]))
  }

  // "04 Oct 2026", "4 oct. 2026", "4 septiembre 2026".
  const named = /^(\d{1,2})\s*([a-z]+)\.?\s+(\d{4})$/i.exec(text)
  if (named) {
    const month = MONTHS[normalizeText(named[2]).slice(0, 3)]
    if (month) {
      return formatParts(Number(named[3]), month, Number(named[1]))
    }
  }
  return null
}

function parseAmountCell(cell: unknown): number | null {
  if (typeof cell === 'number') {
    return Number.isFinite(cell) ? Math.round(cell * 100) : null
  }
  const text = String(cell ?? '').replace(/[\s$]/g, '')
  if (!text) {
    return null
  }
  return parsePesosToCents(text)
}

function findHeader(
  matrix: unknown[][],
): { row: number; date: number; description: number; amount: number } | null {
  const limit = Math.min(matrix.length, MAX_HEADER_SCAN)
  for (let row = 0; row < limit; row++) {
    const cells = (matrix[row] ?? []).map((cell) => normalizeText(cell))
    const date = cells.findIndex((cell) => HEADER_ALIASES.date.includes(cell))
    const description = cells.findIndex((cell) => HEADER_ALIASES.description.includes(cell))
    const amount = cells.findIndex((cell) => HEADER_ALIASES.amount.includes(cell))
    if (date >= 0 && description >= 0 && amount >= 0) {
      return { row, date, description, amount }
    }
  }
  return null
}

/** Convierte la matriz de una hoja de Excel en filas de compra. */
export function parsePurchaseRows(matrix: unknown[][]): ParsedPurchaseFile {
  const header = findHeader(matrix)
  if (!header) {
    return {
      rows: [],
      error: 'No se encontraron las columnas Fecha, Descripcion y Monto en el archivo.',
    }
  }

  const rows: ParsedPurchaseRow[] = []
  for (let index = header.row + 1; index < matrix.length; index++) {
    const cells = matrix[index] ?? []
    if (cells.every((cell) => String(cell ?? '').trim() === '')) {
      continue
    }

    const line = index + 1
    const purchaseDate = parseDateCell(cells[header.date])
    const description = String(cells[header.description] ?? '')
      .trim()
      .slice(0, 200)
    const amount = parseAmountCell(cells[header.amount])

    if (!purchaseDate) {
      rows.push({ line, error: 'No se reconocio la fecha.' })
    } else if (!description) {
      rows.push({ line, purchaseDate, error: 'La fila no tiene nombre o descripcion.' })
    } else if (amount === null) {
      rows.push({ line, purchaseDate, description, error: 'No se reconocio el monto.' })
    } else if (amount <= 0) {
      rows.push({
        line,
        purchaseDate,
        description,
        error: 'No es un cargo (monto cero o negativo).',
      })
    } else {
      rows.push({ line, purchaseDate, description, amount })
    }
  }

  return { rows, error: null }
}
