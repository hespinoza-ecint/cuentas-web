import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils.ts'

type BannerTone = 'neutral' | 'info' | 'warning' | 'danger'

const TONES: Record<BannerTone, string> = {
  neutral: 'border-line bg-surface-strong text-ink-secondary',
  info: 'border-info-line bg-info-soft text-info-ink',
  warning: 'border-warning-line bg-warning-soft text-warning-ink',
  danger: 'border-danger-line bg-danger-soft text-danger-ink',
}

interface BannerProps {
  tone?: BannerTone
  icon?: LucideIcon
  children: ReactNode
  action?: ReactNode
  className?: string
}

/** Franja de aviso a lo ancho de la pantalla (sin conexión, versión nueva…). */
export function Banner({ tone = 'neutral', icon: Icon, children, action, className }: BannerProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b px-4 py-2 text-center text-sm',
        TONES[tone],
        className,
      )}
    >
      {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
      {action}
    </div>
  )
}
