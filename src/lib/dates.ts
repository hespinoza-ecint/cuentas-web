/**
 * Fechas de calendario en formato `YYYY-MM-DD`, sin zona horaria.
 *
 * "Hoy" siempre se calcula en la zona horaria del usuario (la misma que usa el
 * backend), nunca en la del navegador.
 */
const DATE_FORMATTERS = new Map<string, Intl.DateTimeFormat>()

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = DATE_FORMATTERS.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    DATE_FORMATTERS.set(timeZone, formatter)
  }
  return formatter
}

/** Fecha local `YYYY-MM-DD` en la zona horaria indicada. */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): string {
  return formatterFor(timeZone).format(now)
}

/** Suma (o resta) dias de calendario a una fecha `YYYY-MM-DD`. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + days))
  const yyyy = next.getUTCFullYear()
  const mm = String(next.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(next.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** Texto legible para mostrar: "5 oct 2026". */
export function formatLocalDate(date: string, locale = 'es-MX'): string {
  const [year, month, day] = date.split('-').map(Number)
  // Mediodia UTC evita saltos de dia por la zona horaria del navegador.
  const midday = new Date(Date.UTC(year, month - 1, day, 12))
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(midday)
}

/** "2026-10" → "octubre de 2026". */
export function formatMonth(month: string, locale = 'es-MX'): string {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(Date.UTC(year, monthNumber - 1, 1, 12)),
  )
}

/** Marca de tiempo ISO → "5 oct 2026, 14:30". */
export function formatDateTime(iso: string, locale = 'es-MX'): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}
