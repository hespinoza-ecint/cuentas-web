import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { Field } from '../../components/shared/Field.tsx'
import { AuthLayout, SubmitButton } from './AuthLayout.tsx'
import { forgotPassword } from './auth-api.ts'
import { forgotPasswordSchema, type ForgotPasswordForm } from './schemas.ts'

export function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<unknown>(null)
  const [sentMessage, setSentMessage] = useState<string | null>(null)

  const { register, handleSubmit, formState } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      setSentMessage(await forgotPassword(values.email))
    } catch (error) {
      setServerError(error)
    }
  })

  return (
    <AuthLayout
      title="Recuperar contraseña"
      subtitle="Te enviaremos un enlace para restablecerla"
      footer={
        <Link to="/login" className="font-medium text-ink underline">
          Volver a iniciar sesión
        </Link>
      }
    >
      {sentMessage ? (
        <div className="rounded-lg border border-success-line bg-success-soft px-3 py-2 text-sm text-success-ink">
          {sentMessage}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <ErrorAlert error={serverError} />
          <Field
            label="Correo"
            type="email"
            autoComplete="email"
            error={formState.errors.email?.message}
            {...register('email')}
          />
          <SubmitButton pending={formState.isSubmitting}>Enviar enlace</SubmitButton>
        </form>
      )}
    </AuthLayout>
  )
}
