import { cn } from '../../lib/utils.ts'
import { utilizationLevel } from './utilization.ts'

interface UtilizationBarProps {
  bps: number
  maxUtilizationBps: number
  /** Nombre accesible de la barra (por ejemplo, "Utilización de Visa"). */
  label: string
  className?: string
}

export function UtilizationBar({ bps, maxUtilizationBps, label, className }: UtilizationBarProps) {
  const value = Math.min(bps / 100, 100)
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-strong', className)}
    >
      <div
        className={cn('h-full rounded-full', utilizationLevel(bps, maxUtilizationBps).tone)}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}
