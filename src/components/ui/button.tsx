import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils.ts'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-[background-color,border-color,color,transform] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-on-brand hover:bg-brand-hover',
        secondary: 'border border-line-strong bg-surface text-ink-secondary hover:bg-surface-subtle',
        ghost: 'text-ink-secondary hover:bg-surface-subtle',
        danger: 'bg-danger-solid text-on-accent hover:bg-danger-solid-hover',
      },
      size: {
        // En movil los objetivos tactiles son mas altos (40-44px); desde sm
        // vuelven a la densidad original de escritorio.
        sm: 'h-9 px-3 text-xs sm:h-8',
        md: 'h-10 px-4 sm:h-9',
        lg: 'h-11 px-5 sm:h-10',
        // Boton cuadrado para acciones de fila (icono): objetivo tactil de 40px.
        icon: 'size-10 sm:size-9',
        'icon-sm': 'size-9 sm:size-8',
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
    VariantProps<typeof buttonVariants> {
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
      {loading && <ButtonSpinner />}
      {children}
    </button>
  )
}

/** Girador discreto que hereda el color del texto del boton. */
export function ButtonSpinner() {
  return (
    <span
      aria-hidden="true"
      className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  )
}
