/**
 * Conversion de dinero entre pesos (texto de entrada) y centavos (API).
 *
 * Todo el dinero viaja a la API como enteros en centavos; la conversion se
 * hace por cadena de texto para no introducir errores de punto flotante.
 */
const PESOS_PATTERN = /^\$?\s*(-?)(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{1,2}))?$/
const MAX_CENTS = 2_147_483_647

/** Convierte "1,234.56" (o "$1,234.56", "-25.5") a centavos. `null` si es invalido. */
export function parsePesosToCents(input: string): number | null {
  const match = PESOS_PATTERN.exec(input.trim())
  if (!match) {
    return null
  }

  const [, sign, whole, decimals = ''] = match
  const wholeDigits = whole.replace(/,/g, '')
  const cents = Number(wholeDigits) * 100 + Number(decimals.padEnd(2, '0'))

  if (!Number.isSafeInteger(cents) || cents > MAX_CENTS) {
    return null
  }

  return sign === '-' ? -cents : cents
}

const CURRENCY_FORMATTER = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Formatea centavos como moneda: 123456 → "$1,234.56". */
export function formatCents(cents: number): string {
  return CURRENCY_FORMATTER.format(cents / 100)
}
