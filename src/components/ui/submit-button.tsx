import { useOnlineStatus } from '../../lib/online.ts'
import { cn } from '../../lib/utils.ts'
import { Button, type ButtonProps } from './button.tsx'

interface SubmitButtonProps extends Omit<ButtonProps, 'type' | 'loading'> {
  /** La mutacion del formulario esta en curso. */
  pending: boolean
  /** Mensaje mientras corre (por defecto "Guardando…"). */
  pendingLabel?: string
}

/**
 * Boton de guardar de los formularios:
 * - Evita envios duplicados (se deshabilita mientras corre).
 * - Sin conexion se deshabilita y explica por que (no hay cola offline).
 */
export function SubmitButton({
  pending,
  pendingLabel = 'Guardando…',
  children,
  className,
  disabled,
  ...props
}: SubmitButtonProps) {
  const online = useOnlineStatus()

  return (
    <Button
      type="submit"
      loading={pending}
      disabled={disabled || !online}
      title={online ? undefined : 'Sin conexión: vuelve a intentarlo cuando te reconectes'}
      className={cn('max-sm:w-full', className)}
      {...props}
    >
      {pending ? pendingLabel : children}
    </Button>
  )
}
