import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useSearchParams } from 'react-router'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { Field } from '../../components/shared/Field.tsx'
import { AuthLayout, SubmitButton } from './AuthLayout.tsx'
import { resendVerification, verifyEmail } from './auth-api.ts'
import { resendVerificationSchema, type ResendVerificationForm } from './schemas.ts'

type VerifyState = 'idle' | 'verifying' | 'success' | 'error'

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const location = useLocation()
  const token = params.get('token')
  const emailParam = params.get('email') ?? ''
  const registered = Boolean((location.state as { registered?: boolean } | null)?.registered)

  const [state, setState] = useState<VerifyState>(token ? 'verifying' : 'idle')
  const [message, setMessage] = useState(
    registered ? 'Te enviamos un correo con el enlace de verificación.' : '',
  )
  const [verifyError, setVerifyError] = useState<unknown>(null)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [resendError, setResendError] = useState<unknown>(null)
  const started = useRef(false)

  useEffect(() => {
    if (!token || started.current) {
      return
    }
    started.current = true
    verifyEmail(token)
      .then((result) => {
        setState('success')
        setMessage(result)
      })
      .catch((error: unknown) => {
        setState('error')
        setVerifyError(error)
      })
  }, [token])

  const { register, handleSubmit, formState } = useForm<ResendVerificationForm>({
    resolver: zodResolver(resendVerificationSchema),
    defaultValues: { email: emailParam },
  })

  const onResend = handleSubmit(async (values) => {
    setResendMessage(null)
    setResendError(null)
    try {
      setResendMessage(await resendVerification(values.email))
    } catch (error) {
      setResendError(error)
    }
  })

  return (
    <AuthLayout
      title="Verifica tu correo"
      subtitle="Confirma tu dirección para empezar a operar"
      footer={
        <Link to="/login" className="font-medium text-slate-900 underline">
          Ir a iniciar sesión
        </Link>
      }
    >
      <div className="space-y-4">
        {state === 'verifying' && (
          <p className="text-sm text-slate-600">Verificando tu enlace…</p>
        )}

        {state === 'success' && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {message}
          </div>
        )}

        {state === 'error' && (
          <>
            <ErrorAlert error={verifyError} />
            <p className="text-xs text-slate-500">
              El enlace pudo haber vencido o ya fue usado. Solicita uno nuevo.
            </p>
          </>
        )}

        {state === 'idle' && message && <p className="text-sm text-slate-600">{message}</p>}

        <form onSubmit={onResend} className="space-y-4 border-t border-slate-200 pt-4" noValidate>
          <p className="text-sm font-medium text-slate-700">Reenviar verificación</p>
          <ErrorAlert error={resendError} />
          {resendMessage && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {resendMessage}
            </div>
          )}
          <Field
            label="Correo"
            type="email"
            autoComplete="email"
            error={formState.errors.email?.message}
            {...register('email')}
          />
          <SubmitButton pending={formState.isSubmitting}>Reenviar enlace</SubmitButton>
        </form>
      </div>
    </AuthLayout>
  )
}
