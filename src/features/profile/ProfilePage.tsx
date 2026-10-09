import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { Field } from '../../components/shared/Field.tsx'
import { PasswordField } from '../../components/shared/PasswordField.tsx'
import { SuccessAlert } from '../../components/shared/SuccessAlert.tsx'
import { Card, CardDescription, CardTitle } from '../../components/ui/card.tsx'
import { PageHeader } from '../../components/ui/page-header.tsx'
import { SubmitButton } from '../../components/ui/submit-button.tsx'
import { setSessionUser } from '../../lib/auth/session.ts'
import { useSessionUser } from '../auth/use-session.ts'
import { changePassword, updateProfile } from '../users/users-api.ts'

const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'El nombre es obligatorio').max(80, 'Máximo 80 caracteres'),
  lastName: z.string().trim().min(1, 'El apellido es obligatorio').max(80, 'Máximo 80 caracteres'),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es obligatoria'),
    newPassword: z
      .string()
      .min(10, 'La contraseña debe tener al menos 10 caracteres')
      .max(128, 'Máximo 128 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  })

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

export function ProfilePage() {
  const user = useSessionUser()
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: user?.firstName ?? '', lastName: user?.lastName ?? '' },
  })

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      setSessionUser(updated)
      setProfileMessage('Datos actualizados.')
      profileForm.reset({ firstName: updated.firstName, lastName: updated.lastName })
    },
  })

  const passwordMutation = useMutation({
    mutationFn: (values: PasswordForm) =>
      changePassword(values.currentPassword, values.newPassword),
    onSuccess: (message) => {
      setPasswordMessage(message)
      passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' })
    },
  })

  return (
    <div data-testid="profile-page">
      <PageHeader
        title="Perfil"
        description="Tus datos personales y el acceso a la cuenta"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Datos personales</CardTitle>
          <CardDescription>{user?.email}</CardDescription>

          <form
            className="mt-4 space-y-4"
            noValidate
            onSubmit={profileForm.handleSubmit((values) => {
              setProfileMessage(null)
              profileMutation.mutate(values)
            })}
          >
            <ErrorAlert error={profileMutation.error} />
            {profileMessage && <SuccessAlert message={profileMessage} />}
            <Field
              label="Nombre"
              autoComplete="given-name"
              error={profileForm.formState.errors.firstName?.message}
              {...profileForm.register('firstName')}
            />
            <Field
              label="Apellido"
              autoComplete="family-name"
              error={profileForm.formState.errors.lastName?.message}
              {...profileForm.register('lastName')}
            />
            <SubmitButton pending={profileMutation.isPending}>Guardar cambios</SubmitButton>
          </form>
        </Card>

        <Card>
          <CardTitle>Cambiar contraseña</CardTitle>
          <CardDescription>
            Al cambiarla se cierran las demás sesiones activas.
          </CardDescription>

          <form
            className="mt-4 space-y-4"
            noValidate
            onSubmit={passwordForm.handleSubmit((values) => {
              setPasswordMessage(null)
              passwordMutation.mutate(values)
            })}
          >
            <ErrorAlert error={passwordMutation.error} />
            {passwordMessage && <SuccessAlert message={passwordMessage} />}
            <PasswordField
              label="Contraseña actual"
              autoComplete="current-password"
              error={passwordForm.formState.errors.currentPassword?.message}
              {...passwordForm.register('currentPassword')}
            />
            <PasswordField
              label="Nueva contraseña"
              autoComplete="new-password"
              hint="Mínimo 10 caracteres"
              error={passwordForm.formState.errors.newPassword?.message}
              {...passwordForm.register('newPassword')}
            />
            <PasswordField
              label="Confirmar contraseña"
              autoComplete="new-password"
              error={passwordForm.formState.errors.confirmPassword?.message}
              {...passwordForm.register('confirmPassword')}
            />
            <SubmitButton pending={passwordMutation.isPending} pendingLabel="Actualizando…">
              Cambiar contraseña
            </SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  )
}
