import { api } from '../../lib/api/client.ts'
import type { AuthSession } from '../../lib/auth/session.ts'
import { problemFrom } from '../../lib/problem.ts'

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  email: string
  password: string
  firstName: string
  lastName: string
}

interface MessageResponse {
  message?: string
}

function fallbackMessage(data: unknown, fallback: string): string {
  const message = (data as MessageResponse | undefined)?.message
  return message ?? fallback
}

export async function login(input: LoginInput): Promise<AuthSession> {
  const { data, error, response } = await api.POST('/api/v1/auth/login', {
    body: { email: input.email, password: input.password, clientType: 'WEB' },
  })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return { accessToken: data.accessToken, user: data.user }
}

export async function register(input: RegisterInput) {
  const { data, error, response } = await api.POST('/api/v1/auth/register', { body: input })
  if (error || !data) {
    throw problemFrom(error, response)
  }
  return data
}

export async function verifyEmail(token: string): Promise<string> {
  const { data, error, response } = await api.POST('/api/v1/auth/verify-email', {
    body: { token },
  })
  if (error) {
    throw problemFrom(error, response)
  }
  return fallbackMessage(data, 'Correo verificado correctamente.')
}

export async function resendVerification(email: string): Promise<string> {
  const { data, error, response } = await api.POST('/api/v1/auth/resend-verification', {
    body: { email },
  })
  if (error) {
    throw problemFrom(error, response)
  }
  return fallbackMessage(data, 'Si el correo está registrado, enviaremos un nuevo enlace.')
}

export async function forgotPassword(email: string): Promise<string> {
  const { data, error, response } = await api.POST('/api/v1/auth/forgot-password', {
    body: { email },
  })
  if (error) {
    throw problemFrom(error, response)
  }
  return fallbackMessage(data, 'Si el correo está registrado, enviaremos un enlace de recuperación.')
}

export async function resetPassword(token: string, newPassword: string): Promise<string> {
  const { data, error, response } = await api.POST('/api/v1/auth/reset-password', {
    body: { token, newPassword },
  })
  if (error) {
    throw problemFrom(error, response)
  }
  return fallbackMessage(data, 'Contraseña restablecida. Inicia sesión con tu nueva contraseña.')
}

export async function logout(): Promise<void> {
  // Si la sesión ya no existe en el servidor, el cierre local es suficiente.
  await api.POST('/api/v1/auth/logout')
}
