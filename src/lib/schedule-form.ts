/**
 * Modelo y validación de calendarios (frecuencias de ingresos y gastos
 * recurrentes). Se comparte entre el editor visual y los formularios.
 */
export type Frequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM' | 'ONE_TIME'
export type CustomMode = 'everyNDays' | 'daysOfMonth' | 'specificDates'
export type NonBusinessDayRule = 'PREVIOUS' | 'NEXT' | 'NONE'

export interface ScheduleFormValue {
  frequency: Frequency
  dayOfWeek: string
  biweeklyDays: string
  monthlyDay: string
  customMode: CustomMode
  everyNDays: string
  daysOfMonth: string
  specificDates: string
  nonBusinessDayRule: NonBusinessDayRule
  useHolidays: boolean
  startDate: string
  endDate: string
}

export interface SchedulePayload {
  frequency: Frequency
  config?: Record<string, unknown>
  nonBusinessDayRule: NonBusinessDayRule
  useHolidays: boolean
  startDate: string
  endDate?: string
}

export function emptyScheduleValue(today: string): ScheduleFormValue {
  return {
    frequency: 'MONTHLY',
    dayOfWeek: '1',
    biweeklyDays: '15, ULTIMO',
    monthlyDay: '1',
    customMode: 'everyNDays',
    everyNDays: '14',
    daysOfMonth: '1, 15',
    specificDates: today,
    nonBusinessDayRule: 'PREVIOUS',
    useHolidays: true,
    startDate: today,
    endDate: '',
  }
}

function parseDaysList(input: string): (number | 'LAST')[] | null {
  const tokens = input
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 0)
  if (tokens.length === 0) {
    return null
  }
  const parsed: (number | 'LAST')[] = []
  for (const token of tokens) {
    if (token === 'ultimo' || token === 'último' || token === 'last') {
      parsed.push('LAST')
      continue
    }
    const day = Number(token)
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      return null
    }
    parsed.push(day)
  }
  return parsed
}

/** Revisa el calendario y devuelve un mensaje de error, o null si es válido. */
export function validateSchedule(value: ScheduleFormValue): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.startDate)) {
    return 'Indica la fecha de inicio.'
  }
  if (value.endDate && value.endDate < value.startDate) {
    return 'La fecha de fin no puede ser anterior al inicio.'
  }

  switch (value.frequency) {
    case 'WEEKLY':
      return Number(value.dayOfWeek) >= 0 && Number(value.dayOfWeek) <= 6
        ? null
        : 'Elige un día de la semana.'
    case 'BIWEEKLY':
      return parseDaysList(value.biweeklyDays) ? null : 'Captura días entre 1 y 31, o ULTIMO.'
    case 'MONTHLY': {
      const token = value.monthlyDay.trim().toLowerCase()
      const isLast = token === 'ultimo' || token === 'último' || token === 'last'
      const day = Number(token)
      return isLast || (Number.isInteger(day) && day >= 1 && day <= 31)
        ? null
        : 'Captura un día entre 1 y 31, o ULTIMO.'
    }
    case 'CUSTOM':
      if (value.customMode === 'everyNDays') {
        const days = Number(value.everyNDays)
        return Number.isInteger(days) && days >= 1 && days <= 365
          ? null
          : 'Cada N días debe estar entre 1 y 365.'
      }
      if (value.customMode === 'daysOfMonth') {
        return parseDaysList(value.daysOfMonth) ? null : 'Captura días entre 1 y 31.'
      }
      return value.specificDates
        .split(',')
        .map((date) => date.trim())
        .every((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
        ? null
        : 'Captura fechas YYYY-MM-DD separadas por coma.'
    case 'ONE_TIME':
      return /^\d{4}-\d{2}-\d{2}$/.test(value.specificDates)
        ? null
        : 'Indica la fecha del movimiento único.'
    default:
      return null
  }
}

export function scheduleValueToPayload(value: ScheduleFormValue): SchedulePayload {
  let config: Record<string, unknown> | undefined

  if (value.frequency === 'WEEKLY') {
    config = { dayOfWeek: Number(value.dayOfWeek) }
  } else if (value.frequency === 'BIWEEKLY') {
    config = { days: parseDaysList(value.biweeklyDays) }
  } else if (value.frequency === 'MONTHLY') {
    const token = value.monthlyDay.trim().toLowerCase()
    const isLast = token === 'ultimo' || token === 'último' || token === 'last'
    config = { day: isLast ? 'LAST' : Number(token) }
  } else if (value.frequency === 'CUSTOM') {
    if (value.customMode === 'everyNDays') {
      config = { everyNDays: Number(value.everyNDays) }
    } else if (value.customMode === 'daysOfMonth') {
      config = { daysOfMonth: parseDaysList(value.daysOfMonth) }
    } else {
      config = {
        specificDates: value.specificDates.split(',').map((date) => date.trim()),
      }
    }
  } else {
    config = { date: value.specificDates }
  }

  return {
    frequency: value.frequency,
    config,
    nonBusinessDayRule: value.nonBusinessDayRule,
    useHolidays: value.useHolidays,
    startDate: value.startDate,
    ...(value.endDate ? { endDate: value.endDate } : {}),
  }
}

/** Reconstruye el formulario a partir de un calendario guardado (config JSON). */
export function scheduleValueFrom(raw: {
  frequency: string
  config?: unknown
  nonBusinessDayRule?: string | null
  useHolidays?: boolean
  startDate?: string
  endDate?: string | null
}): ScheduleFormValue {
  const base = emptyScheduleValue(raw.startDate ?? '')
  const value: ScheduleFormValue = {
    ...base,
    frequency: raw.frequency as Frequency,
    nonBusinessDayRule: (raw.nonBusinessDayRule as NonBusinessDayRule) ?? 'NONE',
    useHolidays: raw.useHolidays ?? true,
    startDate: raw.startDate ?? base.startDate,
    endDate: raw.endDate ?? '',
  }

  let config: Record<string, unknown> | undefined
  if (typeof raw.config === 'string') {
    try {
      config = JSON.parse(raw.config) as Record<string, unknown>
    } catch {
      config = undefined
    }
  } else if (raw.config && typeof raw.config === 'object') {
    config = raw.config as Record<string, unknown>
  }
  if (!config) {
    return value
  }

  if (typeof config.dayOfWeek === 'number') {
    value.dayOfWeek = String(config.dayOfWeek)
  }
  if (Array.isArray(config.days)) {
    value.biweeklyDays = config.days
      .map((day) => (day === 'LAST' ? 'ULTIMO' : String(day)))
      .join(', ')
  }
  if (config.day !== undefined) {
    value.monthlyDay = config.day === 'LAST' ? 'ULTIMO' : String(config.day)
  }
  if (typeof config.everyNDays === 'number') {
    value.customMode = 'everyNDays'
    value.everyNDays = String(config.everyNDays)
  }
  if (Array.isArray(config.daysOfMonth)) {
    value.customMode = 'daysOfMonth'
    value.daysOfMonth = (config.daysOfMonth as number[]).join(', ')
  }
  if (Array.isArray(config.specificDates)) {
    const dates = config.specificDates as string[]
    if (raw.frequency === 'ONE_TIME') {
      value.specificDates = dates[0] ?? value.specificDates
    } else {
      value.customMode = 'specificDates'
      value.specificDates = dates.join(', ')
    }
  }
  if (typeof config.date === 'string') {
    value.specificDates = config.date
  }

  return value
}
