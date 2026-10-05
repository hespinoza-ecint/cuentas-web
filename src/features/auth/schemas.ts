import { z } from 'zod'

const emailField = z
  .string()
  .trim()
  .min(1, 'El correo es obligatorio')
  .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Escribe un correo válido')

const passwordField = z
  .string()
  .min(10, 'La contraseña debe tener al menos 10 caracteres')
  .max(128, 'La contraseña no debe exceder 128 caracteres')

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, 'El nombre es obligatorio').max(80, 'Máximo 80 caracteres'),
    lastName: z.string().trim().min(1, 'El apellido es obligatorio').max(80, 'Máximo 80 caracteres'),
    email: emailField,
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  })

export const forgotPasswordSchema = z.object({
  email: emailField,
})

export const resetPasswordSchema = z
  .object({
    newPassword: passwordField,
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  })

export const resendVerificationSchema = z.object({
  email: emailField,
})

export type LoginForm = z.infer<typeof loginSchema>
export type RegisterForm = z.infer<typeof registerSchema>
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>
export type ResendVerificationForm = z.infer<typeof resendVerificationSchema>
