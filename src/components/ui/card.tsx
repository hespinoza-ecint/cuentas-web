import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils.ts'

export function Card({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      className={cn('rounded-xl border border-line bg-surface p-5 shadow-sm', className)}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }: ComponentProps<'h2'>) {
  return <h2 className={cn('text-sm font-semibold text-ink', className)} {...props} />
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('mt-0.5 text-xs text-ink-muted', className)} {...props} />
}
