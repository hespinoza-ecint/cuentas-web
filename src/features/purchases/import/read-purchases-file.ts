import { parsePurchaseRows, type ParsedPurchaseFile } from './parse-purchase-rows.ts'

const MAX_FILE_BYTES = 2 * 1024 * 1024
const MAX_ROWS = 500

/**
 * Lee la primera hoja de un .xlsx y la convierte en filas parseadas.
 *
 * `read-excel-file` se carga bajo demanda: solo al usar el dialogo de
 * importacion, asi su chunk no pesa en el arranque de la PWA.
 */
export async function readPurchasesFile(file: File): Promise<ParsedPurchaseFile> {
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    return { rows: [], error: 'El archivo debe ser un Excel (.xlsx).' }
  }
  if (file.size > MAX_FILE_BYTES) {
    return { rows: [], error: 'El archivo supera el limite de 2 MB.' }
  }

  let parsed: ParsedPurchaseFile
  try {
    const { readSheet } = await import('read-excel-file/browser')
    const matrix = await readSheet(file)
    parsed = parsePurchaseRows(matrix)
  } catch {
    return { rows: [], error: 'No se pudo leer el archivo. Revisa que no este danado.' }
  }

  if (parsed.rows.length > MAX_ROWS) {
    return {
      rows: [],
      error: `El archivo tiene ${parsed.rows.length} filas; el maximo es ${MAX_ROWS}. Divide el estado de cuenta.`,
    }
  }
  return parsed
}
