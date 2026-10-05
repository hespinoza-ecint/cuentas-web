import { cn } from '../../lib/utils.ts'
import { formatCents } from '../../lib/money.ts'

interface MoneyDisplayProps {
  cents: number
  /** Colorea según el signo (positivo verde, negativo rojo). */
  colored?: boolean
  className?: string
}

export function MoneyDisplay({ cents, colored = false, className }: MoneyDisplayProps) {
  const tone = colored
    ? cents > 0
      ? 'text-emerald-600'
      : cents < 0
        ? 'text-red-600'
        : 'text-slate-900'
    : ''

  return <span className={cn('tabular-nums', tone, className)}>{formatCents(cents)}</span>
}
