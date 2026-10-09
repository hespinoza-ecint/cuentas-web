import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils.ts'
import { buttonVariants, type ButtonVariantProps } from './button-variants.ts'

export interface ButtonProps extends ComponentProps<'button'>, ButtonVariantProps {
  /** Muestra un girador y deshabilita el boton mientras la accion corre. */
  loading?: boolean
}

export function Button({
  className,
  variant,
  size,
  type = 'button',
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  )
}
