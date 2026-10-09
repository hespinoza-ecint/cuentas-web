import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ErrorAlert } from '../../components/shared/ErrorAlert.tsx'
import { PasswordField } from '../../components/shared/PasswordField.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Checkbox } from '../../components/ui/checkbox.tsx'
import { DialogDescription, DialogFooter, DialogTitle } from '../../components/ui/dialog.tsx'
import { FormDialog } from '../../components/ui/form-dialog.tsx'
import { SubmitButton } from '../../components/ui/submit-button.tsx'
import { deleteAccount } from '../users/users-api.ts'

const deleteSchema = z.object({
  password: z.string().min(1, 'La contraseña es obligatoria'),
  confirm: z.literal(true, { message: 'Debes confirmar que entiendes la consecuencia' }),
})

type DeleteForm = z.infer<typeof deleteSchema>

export function DeleteAccountDialog({
  open,
  onOpenChange,
  onDeleted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: (message: string) => void
}) {
  const form = useForm<DeleteForm>({
    resolver: zodResolver(deleteSchema),
    defaultValues: { password: '', confirm: false as unknown as true },
  })

  const mutation = useMutation({
    mutationFn: (values: DeleteForm) => deleteAccount(values.password),
    onSuccess: (message) => {
      onDeleted(message)
      onOpenChange(false)
    },
  })

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} dirty={form.formState.isDirty}>
      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
          <DialogTitle>Eliminar cuenta</DialogTitle>
          <DialogDescription>
            La cuenta queda inactiva y se elimina definitivamente en 30 días. Puedes cancelar la
            solicitud iniciando sesión de nuevo.
          </DialogDescription>

          <div className="mt-4 space-y-4">
            <PasswordField
              label="Contraseña"
              autoComplete="current-password"
              error={form.formState.errors.password?.message}
              {...form.register('password')}
            />
            <div>
              <Checkbox
                alignTop
                label="Entiendo que mi cuenta se eliminará en 30 días y que la cancelación reinicia la sesión."
                {...form.register('confirm')}
              />
              {form.formState.errors.confirm && (
                <p role="alert" className="text-xs text-danger">
                  {form.formState.errors.confirm.message}
                </p>
              )}
            </div>
          </div>

          <ErrorAlert error={mutation.error} className="mt-4" />

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <SubmitButton pending={mutation.isPending} variant="danger" pendingLabel="Procesando…">
              Eliminar cuenta
            </SubmitButton>
          </DialogFooter>
        </form>
    </FormDialog>
  )
}
