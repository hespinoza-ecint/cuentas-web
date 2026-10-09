import { Eye, EyeOff } from 'lucide-react'
import { useId, useState, type ComponentProps, type ReactNode, type Ref } from 'react'
import { controlClass } from '../ui/control.ts'

interface PasswordFieldProps extends Omit<ComponentProps<'input'>, 'type'> {
  label: string
  error?: string
  hint?: ReactNode
  ref?: Ref<HTMLInputElement>
}

/**
 * Campo de contrasena con boton para mostrar u ocultar el contenido.
 * El boton mide 44px de ancho y anuncia su accion con aria-label.
 */
export function PasswordField({ label, hint, error, id, name, ref, ...rest }: PasswordFieldProps) {
  const generatedId = useId()
  const inputId = id ?? name ?? generatedId
  const errorId = error ? `${inputId}-error` : undefined
  const [visible, setVisible] = useState(false)

  return (
    <div className="min-w-0">
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-ink-secondary">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          name={name}
          ref={ref}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={controlClass({ error: Boolean(error), className: 'pr-12' })}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-muted transition hover:text-ink"
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {hint && !error && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
