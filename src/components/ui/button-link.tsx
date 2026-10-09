import type { ComponentProps } from 'react'
import { Link } from 'react-router'
import { cn } from '../../lib/utils.ts'
import { buttonVariants, type ButtonProps } from './button.tsx'

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
}

/** Enlace con la apariencia exacta de un boton (sin duplicar clases). */
export function ButtonLink({ className, variant, size, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
