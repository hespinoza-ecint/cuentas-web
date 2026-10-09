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
      ? 'text-income'
      : cents < 0
        ? 'text-expense'
        : 'text-ink'
    : ''

  return <span className={cn('tabular-nums', tone, className)}>{formatCents(cents)}</span>
}
