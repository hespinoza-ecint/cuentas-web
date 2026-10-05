import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { Field } from '../../components/shared/Field.tsx'
import { AuthLayout, SubmitButton } from './AuthLayout.tsx'
import { register as registerAccount } from './auth-api.ts'
import { registerSchema, type RegisterForm } from './schemas.ts'

export function RegisterPage() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<unknown>(null)

  const { register, handleSubmit, formState } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      await registerAccount({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
      })
      void navigate(`/verificar-correo?email=${encodeURIComponent(values.email)}`, {
        replace: true,
        state: { registered: true },
      })
    } catch (error) {
      setServerError(error)
    }
  })

  return (
    <AuthLayout
      title="Crear cuenta"
      subtitle="Necesitamos verificar tu correo antes de operar"
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-slate-900 underline">
            Iniciar sesión
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <ErrorAlert error={serverError} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Nombre"
            autoComplete="given-name"
            error={formState.errors.firstName?.message}
            {...register('firstName')}
          />
          <Field
            label="Apellido"
            autoComplete="family-name"
            error={formState.errors.lastName?.message}
            {...register('lastName')}
          />
        </div>
        <Field
          label="Correo"
          type="email"
          autoComplete="email"
          error={formState.errors.email?.message}
          {...register('email')}
        />
        <Field
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          hint="Mínimo 10 caracteres"
          error={formState.errors.password?.message}
          {...register('password')}
        />
        <Field
          label="Confirmar contraseña"
          type="password"
          autoComplete="new-password"
          error={formState.errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <SubmitButton pending={formState.isSubmitting}>Crear cuenta</SubmitButton>
      </form>
    </AuthLayout>
  )
}
