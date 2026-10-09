import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { Field } from '../../components/shared/Field.tsx'
import { AuthLayout, SubmitButton } from './AuthLayout.tsx'
import { resetPassword } from './auth-api.ts'
import { resetPasswordSchema, type ResetPasswordForm } from './schemas.ts'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [serverError, setServerError] = useState<unknown>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const { register, handleSubmit, formState } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = handleSubmit(async (values) => {
    if (!token) {
      return
    }
    setServerError(null)
    try {
      setSuccessMessage(await resetPassword(token, values.newPassword))
    } catch (error) {
      setServerError(error)
    }
  })

  if (!token) {
    return (
      <AuthLayout
        title="Restablecer contraseña"
        subtitle="El enlace no es válido"
        footer={
          <Link to="/recuperar" className="font-medium text-ink underline">
            Solicitar un enlace nuevo
          </Link>
        }
      >
        <p className="text-sm text-ink-secondary">
          Falta el token en el enlace. Solicita uno nuevo desde la pantalla de recuperación.
        </p>
      </AuthLayout>
    )
  }

  if (successMessage) {
    return (
      <AuthLayout
        title="Contraseña actualizada"
        footer={
          <Link to="/login" className="font-medium text-ink underline">
            Iniciar sesión
          </Link>
        }
      >
        <div className="rounded-lg border border-success-line bg-success-soft px-3 py-2 text-sm text-success-ink">
          {successMessage}
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Restablecer contraseña"
      subtitle="Elige una contraseña nueva"
      footer={
        <Link to="/login" className="font-medium text-ink underline">
          Volver a iniciar sesión
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <ErrorAlert error={serverError} />
        <Field
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          hint="Mínimo 10 caracteres"
          error={formState.errors.newPassword?.message}
          {...register('newPassword')}
        />
        <Field
          label="Confirmar contraseña"
          type="password"
          autoComplete="new-password"
          error={formState.errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <SubmitButton pending={formState.isSubmitting}>Restablecer</SubmitButton>
      </form>
    </AuthLayout>
  )
}
