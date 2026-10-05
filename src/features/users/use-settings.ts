import { useQuery } from '@tanstack/react-query'
import { todayInTimeZone } from '../../lib/dates.ts'
import { fetchSettings } from './users-api.ts'

/** Configuración del usuario (zona horaria, colchón, reglas). */
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
    staleTime: 5 * 60_000,
  })
}

/** "Hoy" en la zona horaria del usuario (no la del navegador). */
export function useToday(): string {
  const { data } = useSettings()
  return todayInTimeZone(data?.timezone ?? 'America/Mexico_City')
}
