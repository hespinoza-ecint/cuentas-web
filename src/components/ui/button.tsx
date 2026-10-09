import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils.ts'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-on-brand hover:bg-brand-hover',
        secondary: 'border border-line-strong bg-surface text-ink-secondary hover:bg-surface-subtle',
        ghost: 'text-ink-secondary hover:bg-surface-subtle',
        danger: 'bg-danger-solid text-on-accent hover:bg-danger-solid-hover',
      },
      size: {
        // En móvil los objetivos táctiles son más altos (~40px); desde sm
        // vuelven a la densidad original de escritorio.
        sm: 'h-9 px-3 text-xs sm:h-8',
        md: 'h-10 px-4 sm:h-9',
        lg: 'h-11 px-5 sm:h-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
