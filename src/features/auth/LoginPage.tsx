import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { Field } from '../../components/shared/Field.tsx'
import { setSession } from '../../lib/auth/session.ts'
import { AuthLayout, SubmitButton } from './AuthLayout.tsx'
import { login } from './auth-api.ts'
import { loginSchema, type LoginForm } from './schemas.ts'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [serverError, setServerError] = useState<unknown>(null)

  const { register, handleSubmit, formState } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const state = location.state as { from?: { pathname?: string } } | null
  const from = state?.from?.pathname ?? '/'

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      const session = await login(values)
      setSession(session)
      void navigate(from, { replace: true })
    } catch (error) {
      setServerError(error)
    }
  })

  return (
    <AuthLayout
      title="Cuentas"
      subtitle="Inicia sesión para continuar"
      footer={
        <>
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="font-medium text-slate-900 underline">
            Crear cuenta
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <ErrorAlert error={serverError} />
        <Field
          label="Correo"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          error={formState.errors.email?.message}
          {...register('email')}
        />
        <Field
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          error={formState.errors.password?.message}
          {...register('password')}
        />
        <SubmitButton pending={formState.isSubmitting}>Iniciar sesión</SubmitButton>
        <p className="text-center text-sm">
          <Link to="/recuperar" className="text-slate-600 underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
