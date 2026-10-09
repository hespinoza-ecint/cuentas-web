import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils.ts'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-subtle text-ink-secondary',
        success: 'bg-success-soft text-success-ink',
        warning: 'bg-warning-soft text-warning-ink',
        danger: 'bg-danger-soft text-danger-ink',
        info: 'bg-info-soft text-info-ink',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export interface BadgeProps extends ComponentProps<'span'>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}
