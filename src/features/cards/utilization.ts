import { useSettings } from '../users/use-settings.ts'

/**
 * Umbral de utilizacion del usuario (puntos base). Un solo umbral para Inicio,
 * Tarjetas y el detalle: antes cada pantalla usaba 30 % / 50 % y la misma
 * tarjeta podia verse "Uso medio" en una y "Uso bajo" en otra.
 */
export function useMaxUtilizationBps(): number {
  return useSettings().data?.maxUtilizationBps ?? 3000
}

/** Nivel de uso con palabra (no solo color): accesible para daltonismo. */
export function utilizationLevel(
  bps: number,
  maxUtilizationBps: number,
): { label: string; tone: string } {
  if (bps <= maxUtilizationBps) {
    return { label: 'Uso bajo', tone: 'bg-success' }
  }
  if (bps <= Math.round((maxUtilizationBps * 5) / 3)) {
    return { label: 'Uso medio', tone: 'bg-warning' }
  }
  return { label: 'Uso alto', tone: 'bg-danger' }
}
